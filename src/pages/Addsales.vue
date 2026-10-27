<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { CircleCheck, BadgeDollarSign, Trash2 } from 'lucide-vue-next';

// STATE

const loading = ref(false);
const saving = ref(false);
const saleBy = ref('product');

const medicines = ref([]);
const units = ref([]);
const categories = ref([]);
const customers = ref([]);
const systemStock = ref([]);

const saleItems = ref([]);          // the cart
const selectedCustomer = ref('');
const amountPaid = ref('');

const form = reactive({
    medicine: '',
    unit_name: '',
    unit_price: '',
    quantity: '',
});

// ====================================================================
// DATA FETCHING (one helper instead of five copies)
// ====================================================================
async function load(url, target, label) {
    try {
        const { data } = await api.get(url);
        target.value = data;
    } catch (error) {
        console.error(`Failed to load ${label}`, error);
        toast.error(`Failed to load ${label}`);
    }
}

const fetchSystemStock = () => load('/system-stock', systemStock, 'system stock');

onMounted(async () => {
    loading.value = true;
    await Promise.all([
        load('/medicines', medicines, 'products'),
        load('/customers', customers, 'customers'),
        load('/units', units, 'product units'),
        load('/categories', categories, 'product categories'),
        fetchSystemStock(),
    ]);
    loading.value = false;
});


// SELECTED PRODUCT + UNITS
const selectedMedicine = computed(() =>
    medicines.value.find((m) => m.name === form.medicine) || null
);

// unit name from one entry of medicine.unit_details
function detailUnitName(detail) {
    const unitId = detail.unit_id ?? detail.unit?.id;
    const unit = units.value.find((u) => Number(u.id) === Number(unitId));
    return detail.unit_name ?? detail.unit?.unit_name ?? detail.unit?.name ?? unit?.unit_name;
}

// How many BASE units (e.g. bottles) one of this unit holds.
// >>> If your unit_details uses a different field name, add it to this list <<<
function getFactor(detail) {
    return Number(
        detail.quantity_per_unit ??
        detail.conversion_factor ??
        detail.base_quantity ??
        detail.units_per_pack ??
        detail.qty_per_unit ??
        detail.factor ??
        0
    );
}

const availableUnits = computed(() => {
    const medicine = selectedMedicine.value;
    if (!medicine) return [];

    const names = [medicine.unit_name, medicine.unit?.unit_name, medicine.unit?.name];
    (medicine.unit_details || []).forEach((detail) => names.push(detailUnitName(detail)));

    return [...new Set(names.filter(Boolean))];
});

// [{ name: 'Box', factor: 25 }, { name: 'Bottle', factor: 1 }]
const unitFactors = computed(() =>
    (selectedMedicine.value?.unit_details || [])
        .map((detail) => ({ name: detailUnitName(detail), factor: getFactor(detail) }))
        .filter((u) => u.name && u.factor > 0)
);

// the smallest unit is the base unit (Bottle)
const baseUnit = computed(() =>
    [...unitFactors.value].sort((a, b) => a.factor - b.factor)[0] || null
);

const selectedUnitDetail = computed(() => {
    if (!selectedMedicine.value || !form.unit_name) return null;
    return (selectedMedicine.value.unit_details || []).find(
        (detail) => detailUnitName(detail) === form.unit_name
    ) || null;
});

// fill the unit price whenever the unit changes
watch(() => form.unit_name, () => {
    const detail = selectedUnitDetail.value;

    if (detail) {
        form.unit_price = detail.selling_price ?? detail.price ?? '';
    } else if (selectedMedicine.value && form.unit_name === selectedMedicine.value.unit_name) {
        form.unit_price = selectedMedicine.value.selling_price ?? '';
    } else {
        form.unit_price = '';
    }
});

// ====================================================================
// BATCHES (pick the non-expired batch that expires soonest)
// ====================================================================
// Reads the date as a LOCAL date so time zones don't shift the day
function parseDateOnly(value) {
    if (!value) return null;
    const text = String(value).trim().split(/[T ]/)[0];

    let m = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

    m = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);

    const fallback = new Date(value);
    return isNaN(fallback) ? null : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

function isExpired(value) {
    const date = parseDateOnly(value);
    if (!date) return false; // no date = never expires
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;      // expiring today still counts as valid
}

const availableBatches = computed(() => {
    if (!selectedMedicine.value) return [];
    return systemStock.value.filter((b) => b.medicine_name === selectedMedicine.value.name);
});

const validBatches = computed(() =>
    availableBatches.value.filter((b) => !isExpired(b.expiry_date))
);

const selectedBatch = computed(() =>
    [...validBatches.value].sort((a, b) =>
        (parseDateOnly(a.expiry_date) || new Date(9999, 11, 31)) -
        (parseDateOnly(b.expiry_date) || new Date(9999, 11, 31))
    )[0] || null
);

// the product has batches but every one has expired
const allExpired = computed(() =>
    availableBatches.value.length > 0 && validBatches.value.length === 0
);

const batchNumber = computed(() => selectedBatch.value?.batch_number || '-');

const inStockText = computed(() => {
    const batch = selectedBatch.value;
    if (!batch) return '-';
    const qty = batch.quantity ?? batch.system_qty;
    return `${qty} ${batch.unit_name || ''}`.trim();   // e.g. "10 Boxes"
});


// stock calculation
const stockCalc = computed(() => {
    const batch = selectedBatch.value;
    if (!batch) return null;

    // the unit the stock is stored in
    const storedName = batch.unit_name || baseUnit.value?.name || '';
    const stored = unitFactors.value.find((u) => u.name === storedName)
        || { name: storedName, factor: 1 };
    const base = baseUnit.value || stored;

    const storedQty = Number(batch.quantity ?? batch.system_qty) || 0;
    const totalBase = storedQty * stored.factor;

    // already sitting in the cart for this same batch
    const reservedBase = saleItems.value
        .filter((i) => i.medicine === form.medicine && i.batch_number === batch.batch_number)
        .reduce((sum, i) => sum + i.base_qty, 0);

    // the unit being sold right now
    const sellUnit = unitFactors.value.find((u) => u.name === form.unit_name)
        || (form.unit_name && form.unit_name === stored.name ? stored : null);

    const qty = Number(form.quantity);
    const canConvert = !!sellUnit;
    const soldBase = canConvert && qty > 0 ? qty * sellUnit.factor : 0;

    const availableBase = totalBase - reservedBase;

    return {
        stored, base, totalBase, reservedBase, soldBase, canConvert,
        availableBase,
        remainingBase: availableBase - soldBase,
    };
});

// 249 bottles -> "9 Boxes and 24 Bottles"
function formatBase(amount, stored, base) {
    if (stored.name === base.name || stored.factor <= 1) return `${amount} ${base.name}`;

    const big = Math.floor(amount / stored.factor);
    const small = amount % stored.factor;

    const parts = [];
    if (big > 0) parts.push(`${big} ${stored.name}`);
    if (small > 0 || big === 0) parts.push(`${small} ${base.name}`);
    return parts.join(' and ');
}

const needsConversion = computed(() => {
    const c = stockCalc.value;
    return !!c && c.stored.name !== c.base.name && c.stored.factor > 1;
});

// "1 Box contains 25 Bottles. Total: 250 Bottles"
const conversionMessage = computed(() => {
    const c = stockCalc.value;
    if (!c || !needsConversion.value) return '';
    return `1 ${c.stored.name} contains ${c.stored.factor} ${c.base.name}. Total: ${c.totalBase} ${c.base.name}`;
});

// "Already in cart: 24 Bottles"
const inCartMessage = computed(() => {
    const c = stockCalc.value;
    if (!c || c.reservedBase <= 0) return '';
    return `Already in cart: ${formatBase(c.reservedBase, c.stored, c.base)}`;
});

// "After this sale: 9 Boxes and 24 Bottles left (249 Bottles)"
const remainingMessage = computed(() => {
    const c = stockCalc.value;
    if (!c || c.soldBase <= 0 || insufficientStock.value) return '';

    let text = `After this sale: ${formatBase(c.remainingBase, c.stored, c.base)} left`;
    if (needsConversion.value) text += ` (${c.remainingBase} ${c.base.name})`;
    return text;
});

const insufficientStock = computed(() => {
    const c = stockCalc.value;
    return !!c && c.canConvert && c.soldBase > c.availableBase;
});



// cart
function medicineCategory(medicine) {
    if (!medicine) return '';
    if (medicine.category_name) return medicine.category_name;
    if (typeof medicine.category === 'string') return medicine.category;
    return medicine.category?.name ?? medicine.category?.category_name ?? '';
}

function addItemToCart() {
    const quantity = Number(form.quantity);
    const unit_price = Number(form.unit_price);

    if (!form.medicine || !form.unit_name) {
        return toast.error('Please select a product and a unit');
    }
    if (!(quantity > 0) || !(unit_price > 0)) {
        return toast.error('Enter a valid quantity and unit price');
    }
    if (allExpired.value || !selectedBatch.value) {
        return toast.error('No valid batch available for this product');
    }
    if (insufficientStock.value) {
        return toast.error('Not enough stock for this quantity');
    }

    const batch_number = selectedBatch.value.batch_number;
    const base_qty = stockCalc.value?.soldBase ?? 0;

    // same product + unit + batch: add to the existing line instead of a duplicate
    const existing = saleItems.value.find((item) =>
        item.medicine === form.medicine &&
        item.unit_name === form.unit_name &&
        item.batch_number === batch_number
    );

    if (existing) {
        existing.quantity += quantity;
        existing.base_qty += base_qty;
        existing.unit_price = unit_price;
    } else {
        saleItems.value.push({
            id: Date.now(),
            medicine_id: selectedMedicine.value.id,
            category: medicineCategory(selectedMedicine.value),
            medicine: form.medicine,
            unit_name: form.unit_name,
            unit_price,
            quantity,
            batch_number,
            base_qty,
        });
    }

    toast.success(`Added ${form.medicine} to Cart`);
    resetForm();
}

function resetForm() {
    form.medicine = '';
    form.unit_name = '';
    form.unit_price = '';
    form.quantity = '';
}

function removeItem(id) {
    saleItems.value = saleItems.value.filter((item) => item.id !== id);
}

function clearCart() {
    saleItems.value = [];
    amountPaid.value = '';
    selectedCustomer.value = '';
}

// ====================================================================
// TOTALS + CHECKOUT
// ====================================================================
const cartTotal = computed(() =>
    saleItems.value.reduce((total, item) => total + item.unit_price * item.quantity, 0)
);

const balance = computed(() =>
    Math.max(cartTotal.value - Number(amountPaid.value || 0), 0)
);

async function completeSale() {
    if (!saleItems.value.length) return toast.error('Cart is empty');

    saving.value = true;
    try {
        await api.post('/sales', {
            customer_id: selectedCustomer.value || null,
            items: saleItems.value,
            total: cartTotal.value,
            amount_paid: Number(amountPaid.value || 0),
            balance: balance.value,
        });
        toast.success('Sale completed');
        clearCart();
        await fetchSystemStock(); // refresh the stock numbers
    } catch (error) {
        console.error('Failed to complete sale', error);
        toast.error('Failed to complete sale');
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div class="min-h-screen w-full">
        <div class="h-full flex flex-col pb-10 p-2">
            <div class="flex items-center justify-between border-b border-gray-200 p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">Point of sales</h2>
                </div>
                <div class="font-medium text-sm">
                    <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                    <span class="text-gray-400">/ Point of Sales</span>
                </div>
            </div>

            <div class="grid grid-cols-1 items-start gap-3 lg:grid-cols-[1fr_2fr] pl-3 pr-3 pt-3 pb-4">
                <!-- ============ LEFT COLUMN ============ -->
                <div class="bg-white rounded-sm shadow-sm border border-gray-200 p-5">
                    <div class="flex items-center justify-center text-sm text-gray-500 font-semibold pb-4">
                        <h3>Sale By</h3>
                    </div>

                    <form @submit.prevent="addItemToCart" class="space-y-4">
                        <div class="flex items-center justify-center gap-6 border-b border-gray-200 pb-4">
                            <label for="product" class="flex items-center gap-2 text-xs">
                                <input type="radio" id="product" name="saleBy" value="product" class="cursor-pointer" v-model="saleBy">
                                Product
                            </label>
                            <label for="bar_code" class="flex items-center gap-2 text-xs">
                                <input type="radio" id="bar_code" name="saleBy" value="bar_code" class="cursor-pointer" v-model="saleBy">
                                Bar code
                            </label>
                        </div>

                        <div class="space-y-3" v-if="saleBy === 'product'">
                            <div>
                                <label class="block font-medium text-xs mb-1 text-gray-500">Product</label>
                                <select v-model="form.medicine"
                                        @change="form.unit_name = ''; form.unit_price = ''; form.quantity = ''"
                                        class="border border-gray-200 rounded-sm w-full p-2 text-xs">
                                    <option value="">Select option</option>
                                    <option v-for="med in medicines" :key="med.id" :value="med.name">{{ med.name }}</option>
                                </select>

                                <label class="block font-medium text-xs mb-1 text-gray-500 mt-2">Unit</label>
                                <select v-model="form.unit_name" class="border border-gray-200 rounded-sm w-full p-2 text-xs">
                                    <option value="">Select option</option>
                                    <option v-for="unitName in availableUnits" :key="unitName" :value="unitName">{{ unitName }}</option>
                                </select>
                            </div>

                            <div class="grid grid-cols-1 gap-3">
                                <div>
                                    <label for="unit_price" class="mb-1 block text-xs font-medium text-gray-500">Unit Price</label>
                                    <div class="relative">
                                        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-gray-500">UGX</span>
                                        <input id="unit_price" type="number" min="0" v-model.number="form.unit_price"
                                               class="w-full rounded-sm border border-gray-200 py-2 pl-12 pr-2 text-xs">
                                    </div>
                                </div>

                                <div>
                                    <label for="quantity" class="block text-xs mb-1 text-gray-500 font-medium">Quantity</label>
                                    <input id="quantity" type="number" min="1" v-model.number="form.quantity" :disabled="allExpired"
                                           class="border border-gray-200 w-full rounded-sm p-1 disabled:bg-gray-100 text-xs p-2">
                                </div>
                            </div>

                            <div class="border-t border-gray-200 pt-3 text-sm">
                                <div class="flex items-center justify-between italic">
                                    <p><span class="text-green-500">Batch:</span>
                                       <span class="font-medium">{{ batchNumber }}</span></p>
                                    <p><span class="text-green-500">In Stock:</span>
                                       <span class="font-medium">{{ inStockText }}</span></p>
                                </div>

                                <p v-if="conversionMessage" class="text-xs text-gray-500 italic mt-2">{{ conversionMessage }}</p>
                                <p v-if="inCartMessage" class="text-xs text-gray-500 italic mt-1">{{ inCartMessage }}</p>
                                <p v-if="remainingMessage" class="text-xs text-red-600 italic mt-1">{{ remainingMessage }}</p>
                                <p v-if="allExpired" class="text-red-500 italic text-xs mt-2">
                                    Batch level products expired!! Can't be Sold...
                                </p>
                            </div>
                        </div>

                        <button type="submit" :disabled="allExpired || insufficientStock"
                                class="w-full bg-green-600 hover:bg-green-700 rounded-sm items-center justify-center flex gap-2 px-4 py-2 text-white font-medium cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed">
                            <CircleCheck class="h-4 w-4 shrink-0" aria-hidden="true" /> Submit
                        </button>
                    </form>
                </div>

                <!--right column-->
                <div>
                    <div v-if="saleItems.length === 0"
                         class="border border-gray-200 rounded-sm p-10 bg-gray-200 space-y-3 flex flex-col items-center justify-center min-h-[240px]">
                        <div class="p-3 bg-gray-100 rounded-full text-green-500">
                            <BadgeDollarSign />
                        </div>
                        <h3 class="font-medium text-gray-700 text-xl">No Sales Made Yet!</h3>
                        <p class="text-gray-400 text-sm max-w-xs">Fill out the Sales form and preview your Sales</p>
                    </div>

                    <div v-else class="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
                        <div class="p-4 border-b border-gray-200 flex items-center justify-end bg-gray-50">
                            <button type="button" @click="clearCart" class="text-xs rounded-sm px-4 py-2 text-green-500">
                                Clear cart
                            </button>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="text-left border-collapse w-full text-xs">
                                <thead class="text-gray-600 text-xs">
                                    <tr>
                                        <th class="px-2 py-2 font-medium">#</th>
                                        <th class="px-2 py-2 font-medium">Category</th>
                                        <th class="px-2 py-2 font-medium">Product</th>
                                        <th class="px-2 py-2 font-medium">Batch</th>
                                        <th class="px-2 py-2 font-medium">Unit</th>
                                        <th class="px-2 py-2 font-medium">Price</th>
                                        <th class="px-2 py-2 font-medium">Quantity</th>
                                        <th class="px-2 py-2 font-medium text-center">Remove</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-200">
                                    <tr v-for="(sale, index) in saleItems" :key="sale.id">
                                        <td class="px-2 py-2 font-medium">{{ index + 1 }}</td>
                                        <td class="px-2 py-2 font-medium">{{ sale.category }}</td>
                                        <td class="px-2 py-2 font-medium">{{ sale.medicine }}</td>
                                        <td class="px-2 py-2 font-medium">{{ sale.batch_number }}</td>
                                        <td class="px-2 py-2 font-medium">{{ sale.unit_name }}</td>
                                        <td class="px-2 py-2 font-medium">{{ sale.unit_price.toLocaleString() }}</td>
                                        <td class="px-2 py-2 font-medium">{{ sale.quantity }}</td>
                                        <td class="px-2 py-2 text-center">
                                            <button type="button" @click="removeItem(sale.id)"
                                                    class="bg-red-500 rounded-sm text-white px-2 py-1.5 cursor-pointer">
                                                <Trash2 class="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="border-t border-gray-200 p-4 space-y-4 text-sm">
                            <div class="flex items-center justify-between">
                                <div class="inline-flex items-center gap-3">
                                    <p class="text-black text-xl">Total: </p>
                                    <p class="text-black text-xl font-medium">UGX {{ cartTotal.toLocaleString() }}</p>
                                </div>
                                <div class="text-right text-red-600 text-xl inline-flex gap-3 ">
                                    <p>Balance: </p>
                                    <p class="font-semibold">UGX {{ balance.toLocaleString() }}</p>
                            </div>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block font-medium text-sm mb-1 text-black">Known Customer</label>
                                    <select v-model="selectedCustomer" class="border border-gray-200 rounded-sm w-full p-2 text-xs">
                                        <option value="">Walk-in customer</option>
                                        <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block font-medium text-xs mb-1 text-black">Pay Date</label>
                                    <input type="date"  v-model="date"
                                           class="border border-gray-200 rounded-sm w-full p-2.5 text-xs">
                                </div>
                            </div>
                            <button type="button" @click="completeSale" :disabled="saving"
                                    class="w-full bg-green-600 hover:bg-green-700 rounded-sm px-4 py-2 text-white text-sm font-medium disabled:opacity-50">
                                {{ saving ? 'Saving...' : 'Submit & Exit' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
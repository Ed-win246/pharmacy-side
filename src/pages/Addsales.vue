<script setup>
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { CircleCheck, BadgeDollarSign, Trash2, Plus, X } from 'lucide-vue-next';

// ====================================================================
// STATE
// ====================================================================
const loading = ref(false);
const saving = ref(false);
const adding = ref(false);
const saleBy = ref('product');

const medicines = ref([]);
const units = ref([]);
const categories = ref([]);
const customers = ref([]);
const systemStock = ref([]);        // the batch rows (stock levels)

const saleItems = ref([]);          // the cart (loaded from the database)
const selectedCustomer = ref('');
const amountPaid = ref('');
const payDate = ref(formatLocalDate(new Date()));

const form = reactive({
    medicine: '',
    unit_name: '',
    unit_price: '',
    quantity: '',
});

// ====================================================================
// DATA FETCHING
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

// the batch table: it has the real id, is_active and base_quantity
const fetchSystemStock = () => load('/stock-levels', systemStock, 'stock levels');
const fetchCartItems = () => load('/cart-items', saleItems, 'cart items');

onMounted(async () => {
    loading.value = true;
    await Promise.all([
        load('/medicines', medicines, 'products'),
        load('/customers', customers, 'customers'),
        load('/units', units, 'product units'),
        load('/categories', categories, 'product categories'),
        fetchSystemStock(),
        fetchCartItems(),
    ]);
    loading.value = false;
});

// when you come back to this tab (for example after activating a batch), reload the stock
const refreshStock = () => { if (!document.hidden) fetchSystemStock(); };
onMounted(() => document.addEventListener('visibilitychange', refreshStock));
onUnmounted(() => document.removeEventListener('visibilitychange', refreshStock));

// ====================================================================
// SELECTED PRODUCT + UNITS
// ====================================================================
const selectedMedicine = computed(() =>
    medicines.value.find((m) => m.name === form.medicine) || null
);

// unit name from one entry of medicine.unit_details
function detailUnitName(detail) {
    const unitId = detail.unit_id ?? detail.unit?.id;
    const unit = units.value.find((u) => Number(u.id) === Number(unitId));
    return detail.unit_name ?? detail.unit?.unit_name ?? detail.unit?.name ?? unit?.unit_name;
}

const availableUnits = computed(() => {
    const medicine = selectedMedicine.value;
    if (!medicine) return [];

    const names = [medicine.unit_name, medicine.unit?.unit_name, medicine.unit?.name];
    (medicine.unit_details || []).forEach((detail) => names.push(detailUnitName(detail)));

    return [...new Set(names.filter(Boolean))];
});

// [{ name: 'Tablet', factor: 1 }, { name: 'Box', factor: 10 }]
// the product's own unit is the smallest (1); each bigger unit says how many smallest units fit inside
const unitFactors = computed(() => {
    const med = selectedMedicine.value;
    if (!med) return [];

    const list = [{ name: med.unit_name, factor: 1 }];
    (med.unit_details || []).forEach((d) => {
        const name = detailUnitName(d);
        const factor = Number(d.quantity ?? d.quantity_per_unit ?? 0);
        if (name && factor > 0 && !list.some((u) => u.name === name)) {
            list.push({ name, factor });
        }
    });
    return list.filter((u) => u.name);
});

// the smallest unit is the base unit (Tablet)
const baseUnit = computed(() =>
    unitFactors.value.find((u) => u.factor === 1) || unitFactors.value[0] || null
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
// BATCHES: only the ACTIVATED batch can be sold (and only if valid)
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

// compares names ignoring capitals and extra spaces
const sameName = (a, b) =>
    String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

const availableBatches = computed(() => {
    if (!selectedMedicine.value) return [];
    return systemStock.value.filter((b) => sameName(b.medicine_name, selectedMedicine.value.name));
});

// is_active may arrive as true or 1
const isActive = (b) => b.is_active === true || Number(b.is_active) === 1;

// the activated batch of this product
const activeBatch = computed(() =>
    availableBatches.value.find(isActive) || null
);

// the batch that may be sold: activated, not expired, not empty
const selectedBatch = computed(() => {
    const b = activeBatch.value;
    if (!b) return null;
    if (isExpired(b.expiry_date)) return null;
    if (Number(b.base_quantity ?? b.quantity) < 1) return null;
    return b;
});

// the reason nothing shows (an empty string when everything is fine)
const batchProblem = computed(() => {
    if (!selectedMedicine.value) return '';
    if (availableBatches.value.length === 0) return 'No stock has been added for this product';
    if (!activeBatch.value) return 'No active batch. Activate one on the Batch Levels page to make a sale';
    if (isExpired(activeBatch.value.expiry_date)) return 'The active batch has expired. Activate another batch';
    if (!selectedBatch.value) return 'The active batch is empty. Activate another batch';
    return '';
});

const batchNumber = computed(() => selectedBatch.value?.batch_number || '-');

// ====================================================================
// STOCK CALCULATION
// The server already takes cart items out of stock, so the numbers we
// receive are the stock that is really left. No cart subtraction here.
// ====================================================================
const stockCalc = computed(() => {
    const batch = selectedBatch.value;
    if (!batch) return null;

    // the unit the stock was added in (Box)
    const storedName = batch.unit_name || baseUnit.value?.name || '';
    const stored = unitFactors.value.find((u) => u.name === storedName)
        || { name: storedName, factor: 1 };
    const base = baseUnit.value || stored;

    // real stock left, in the smallest unit (tablets)
    const storedQty = Number(batch.quantity ?? batch.system_qty) || 0;
    const totalBase = Number(batch.base_quantity ?? storedQty * stored.factor);

    // the unit being sold right now
    const sellUnit = unitFactors.value.find((u) => u.name === form.unit_name)
        || (form.unit_name && form.unit_name === stored.name ? stored : null);

    const qty = Number(form.quantity);
    const canConvert = !!sellUnit;
    const soldBase = canConvert && qty > 0 ? qty * sellUnit.factor : 0;

    return {
        stored, base, totalBase, soldBase, canConvert,
        remainingBase: totalBase - soldBase,
    };
});

// 497 tablets -> "49 Box and 7 Tablet"
function formatBase(amount, stored, base) {
    if (stored.name === base.name || stored.factor <= 1) return `${amount} ${base.name}`;

    const big = Math.floor(amount / stored.factor);
    const small = amount % stored.factor;

    const parts = [];
    if (big > 0) parts.push(`${big} ${stored.name}`);
    if (small > 0 || big === 0) parts.push(`${small} ${base.name}`);
    return parts.join(' and ');
}

// In Stock reads the real remaining stock, e.g. "49 Box and 7 Tablet"
const inStockText = computed(() => {
    const c = stockCalc.value;
    if (!c) return '-';
    return formatBase(c.totalBase, c.stored, c.base);
});

const needsConversion = computed(() => {
    const c = stockCalc.value;
    return !!c && c.stored.name !== c.base.name && c.stored.factor > 1;
});

// "1 Box contains 10 Tablet. Total: 500 Tablet"
const conversionMessage = computed(() => {
    const c = stockCalc.value;
    if (!c || !needsConversion.value) return '';
    return `1 ${c.stored.name} contains ${c.stored.factor} ${c.base.name}. Total: ${c.totalBase} ${c.base.name}`;
});

const insufficientStock = computed(() => {
    const c = stockCalc.value;
    return !!c && c.canConvert && c.soldBase > c.totalBase;
});

// "After this sale: 49 Box and 7 Tablet left (497 Tablet)"
const remainingMessage = computed(() => {
    const c = stockCalc.value;
    if (!c || c.soldBase <= 0 || insufficientStock.value) return '';

    let text = `After this sale: ${formatBase(c.remainingBase, c.stored, c.base)} left`;
    if (needsConversion.value) text += ` (${c.remainingBase} ${c.base.name})`;
    return text;
});

// ====================================================================
// CART (saved in the database)
// ====================================================================
function resetForm() {
    form.medicine = '';
    form.unit_name = '';
    form.unit_price = '';
    form.quantity = '';
}

async function addItemToCart() {
    const quantity = Number(form.quantity);
    const unit_price = Number(form.unit_price);

    if (!form.medicine || !form.unit_name) {
        return toast.error('Please select a product and a unit');
    }
    if (!(quantity > 0) || !(unit_price > 0)) {
        return toast.error('Enter a valid quantity and unit price');
    }
    if (batchProblem.value || !selectedBatch.value) {
        return toast.error(batchProblem.value || 'No active batch for this product');
    }
    if (insufficientStock.value) {
        return toast.error('Not enough stock for this quantity');
    }

    adding.value = true;
    try {
        await api.post('/cart-items', {
            medicine_id: selectedMedicine.value.id,
            stock_level_id: selectedBatch.value.id,    // the batch row's id
            unit_name: form.unit_name,
            unit_price,
            quantity,
        });
        toast.success(`Added ${form.medicine} to Cart`);
        resetForm();
        // reload both: the new cart and the reduced stock numbers
        await Promise.all([fetchCartItems(), fetchSystemStock()]);
    } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to add to cart');
    } finally {
        adding.value = false;
    }
}

// ---- delete one line (with confirmation) ----
const cartItemToDelete = ref(null);
const deleting = ref(false);
const showDeleteModal = ref(false);

function askRemove(item) {
    cartItemToDelete.value = item;
    showDeleteModal.value = true;
}

async function removeItem() {
    if (!cartItemToDelete.value) return;
    deleting.value = true;

    try {
        await api.delete(`/cart-items/${cartItemToDelete.value.id}`);   // server puts the stock back
        toast.success('Cart item deleted successfully');
        showDeleteModal.value = false;
        cartItemToDelete.value = null;
        await Promise.all([fetchCartItems(), fetchSystemStock()]);
    } catch (error) {
        console.error('Failed to remove item', error);
        toast.error(error.response?.data?.message || 'Failed to remove item');
    } finally {
        deleting.value = false;
    }
}

// ---- clear the whole cart (puts ALL stock back) ----
async function clearCart() {
    try {
        await api.delete('/cart-items');
        await Promise.all([fetchCartItems(), fetchSystemStock()]);
    } catch (error) {
        console.error('Failed to clear cart', error);
        toast.error('Failed to clear cart');
    }
}

// ====================================================================
// TOTALS + CHECKOUT
// ====================================================================
const cartTotal = computed(() =>
    saleItems.value.reduce((total, item) => total + Number(item.unit_price) * Number(item.quantity), 0)
);

const balance = computed(() =>
    Math.max(cartTotal.value - Number(amountPaid.value || 0), 0)
);

async function completeSale() {
    if (!saleItems.value.length) return toast.error('Cart is empty');

    saving.value = true;
    try {
        // the server builds the sale from the cart rows it already has
        await api.post('/sales', {
            customer_id: selectedCustomer.value || null,
            amount_paid: Number(amountPaid.value || 0),
            pay_date: payDate.value,
        });
        toast.success('Sale completed');

        // reset the screen only. Do NOT call clearCart(): that would give the sold stock back
        amountPaid.value = '';
        selectedCustomer.value = '';
        useCustomer.value = false;
        payDate.value = formatLocalDate(new Date());
        await Promise.all([fetchCartItems(), fetchSystemStock()]);
    } catch (error) {
        console.error('Failed to complete sale', error);
        toast.error(error.response?.data?.message || 'Failed to complete sale');
    } finally {
        saving.value = false;
    }
}

// ====================================================================
// CUSTOMER (known customer checkbox + new customer modal)
// ====================================================================
const useCustomer = ref(false);        // the checkbox
const showCustomerForm = ref(false);   // opens the customer form

// unchecking returns to "Random customer" and closes the form
watch(useCustomer, (checked) => {
    if (!checked) {
        selectedCustomer.value = '';
        showCustomerForm.value = false;
    }
});

const customerForm = reactive({
    name: '',
    email: '',
    contact: '',
    location: '',
});

const savingCustomer = ref(false);

async function saveNewCustomer() {
    const payload = {
        name: customerForm.name.trim(),
        email: customerForm.email.trim(),
        contact: String(customerForm.contact ?? '').trim(),
        location: customerForm.location.trim(),
    };

    savingCustomer.value = true;

    try {
        const { data } = await api.post('/customers', payload);
        const createdCustomer = data?.customer ?? data?.data ?? data;

        customers.value.unshift(createdCustomer);
        selectedCustomer.value = createdCustomer.id ?? '';
        showCustomerForm.value = false;

        Object.assign(customerForm, { name: '', email: '', contact: '', location: '' });
        toast.success('Customer added successfully');
    } catch (error) {
        console.error('Failed to add new customer', error);
        toast.error('Failed to add new customer');
    } finally {
        savingCustomer.value = false;
    }
}

// ====================================================================
// DATES
// ====================================================================
function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const today = computed(() => formatLocalDate(new Date()));
</script>

<template>
    <div class="min-h-screen w-full">
        <div class="h-full flex flex-col pb-10 p-2">
            <div class="flex items-center justify-between p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">Point of sales</h2>
                </div>
                <div class="font-medium text-sm">
                    <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                    <span class="text-gray-400">/ Point of Sales</span>
                </div>
            </div>

            <div class="grid grid-cols-1 items-start gap-3 lg:grid-cols-[1fr_2fr] pl-3 pr-3 pt-6 pb-4 bg-white rounded-sm">
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
                                    <input id="quantity" type="number" min="1" v-model.number="form.quantity" :disabled="!selectedBatch"
                                           class="border border-gray-200 w-full rounded-sm disabled:bg-gray-100 text-xs p-2">
                                </div>
                            </div>

                            <div class="border-t border-gray-200 pt-3 text-sm">
                                <!-- shown ONLY when the product has an activated, valid batch -->
                                <div v-if="selectedBatch">
                                    <div class="flex items-center justify-between italic">
                                        <p><span class="text-green-500">Batch:</span>
                                           <span class="font-medium">{{ batchNumber }}</span></p>
                                        <p><span class="text-green-500">In Stock:</span>
                                           <span class="font-medium">{{ inStockText }}</span></p>
                                    </div>

                                    <p v-if="conversionMessage" class="text-xs text-gray-500 italic mt-2">{{ conversionMessage }}</p>
                                    <p v-if="remainingMessage" class="text-xs text-red-600 italic mt-1">{{ remainingMessage }}</p>
                                    <p v-if="insufficientStock" class="text-xs text-red-500 italic mt-1">
                                        Not enough stock for this quantity!
                                    </p>
                                </div>

                                <!-- otherwise: say why nothing is showing -->
                                <p v-else-if="batchProblem" class="text-xs text-red-500 italic">{{ batchProblem }}</p>
                            </div>
                        </div>

                        <!-- bar code branch (placeholder until the barcode lookup is built) -->
                        <div v-else class="space-y-3">
                            <div>
                                <label class="block text-xs font-medium mb-1 text-gray-500">Product</label>
                                <select v-model="form.medicine"
                                        @change="form.unit_name = ''; form.unit_price = ''; form.quantity = ''"
                                        class="border border-gray-200 rounded-sm w-full p-2 text-xs">
                                    <option value="">Select Option</option>
                                    <option v-for="med in medicines" :key="med.id" :value="med.name">{{ med.name }}</option>
                                </select>

                                <label class="block mb-1 text-xs font-medium text-gray-500 mt-2">Unit</label>
                                <select v-model="form.unit_name" class="border border-gray-200 rounded-sm p-2 w-full text-xs">
                                    <option value="">Select unit</option>
                                    <option v-for="unitName in availableUnits" :key="unitName" :value="unitName">{{ unitName }}</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" :disabled="!selectedBatch || insufficientStock || adding"
                                class="w-full bg-green-600 hover:bg-green-700 rounded-sm items-center justify-center flex gap-2 px-4 py-2 text-white font-medium cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed">
                            <CircleCheck class="h-4 w-4 shrink-0" aria-hidden="true" />
                            {{ adding ? 'Adding...' : 'Submit' }}
                        </button>
                    </form>
                </div>

                <!-- ============ RIGHT COLUMN ============ -->
                <div>
                    <div v-if="saleItems.length === 0"
                         class="border border-gray-200 rounded-sm p-10 bg-gray-200 space-y-3 flex flex-col items-center justify-center min-h-[240px]">
                        <div class="p-3 bg-gray-100 rounded-full text-green-500">
                            <BadgeDollarSign />
                        </div>
                        <h3 class="font-medium text-gray-700 text-xl">No Sales Made Yet!</h3>
                        <p class="text-gray-400 text-sm max-w-xs">Fill out the Sales form and preview your Cart!</p>
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
                                        <td class="px-2 py-2 font-medium">{{ sale.medicine_name }}</td>
                                        <td class="px-2 py-2 font-medium">{{ sale.batch_number }}</td>
                                        <td class="px-2 py-2 font-medium">{{ sale.unit_name }}</td>
                                        <td class="px-2 py-2 font-medium">{{ Number(sale.unit_price).toLocaleString() }}</td>
                                        <td class="px-2 py-2 font-medium">{{ sale.quantity }}</td>
                                        <td class="px-2 py-2 text-center">
                                            <button type="button" @click="askRemove(sale)"
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
                                <div class="text-right text-red-600 text-xl inline-flex gap-3">
                                    <p>Balance: </p>
                                    <p class="font-semibold">UGX {{ balance.toLocaleString() }}</p>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <div class="mb-1 flex items-center gap-2">
                                        <button v-if="useCustomer" type="button" @click="showCustomerForm = true"
                                                class="rounded-sm bg-green-600 p-2 text-xs font-medium text-white hover:bg-green-700 cursor-pointer">
                                            <Plus class="h-3 w-3 text-white" aria-hidden="true" />
                                        </button>
                                        <label class="flex cursor-pointer items-center gap-2 text-sm text-black">
                                            Known customer
                                            <input type="checkbox" v-model="useCustomer" class="cursor-pointer">
                                        </label>
                                    </div>

                                    <div class="flex items-center gap-2">
                                        <select v-model="selectedCustomer" :disabled="!useCustomer"
                                                class="border border-gray-200 rounded-sm w-full p-2 text-xs disabled:bg-gray-100 appearance-none">
                                            <option v-if="!useCustomer" value="">Random customer</option>
                                            <option v-else disabled value="">Select Customer</option>
                                            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label class="block font-medium text-xs mb-1 text-black">Pay Date</label>
                                    <input type="date" v-model="payDate" :min="today"
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

        <!-- ============ NEW CUSTOMER MODAL ============ -->
        <div v-if="showCustomerForm" class="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
            <div class="bg-white max-w-md max-h-[80vh] overflow-y-auto shadow-sm rounded-sm w-full">
                <div class="flex items-center justify-between border-b border-gray-200 p-4">
                    <h3 class="font-semibold text-gray-700 text-xl">New Customer</h3>
                    <button type="button" @click="showCustomerForm = false"
                            aria-label="Close customer form" class="text-gray-400 cursor-pointer">
                        <X class="h-4 w-4" />
                    </button>
                </div>

                <form @submit.prevent="saveNewCustomer" class="space-y-4 sm:p-6">
                    <div class="grid grid-cols-1 p-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                            <input type="text" v-model="customerForm.name" required placeholder="john doe"
                                   class="w-full px-4 py-2 border border-gray-200 placeholder:text-xs rounded-sm">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 p-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" v-model="customerForm.email" required placeholder="example@gmail.com"
                                   class="w-full px-4 py-2 border border-gray-200 placeholder:text-xs rounded-sm">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Contact</label>
                            <input type="tel" v-model="customerForm.contact" required placeholder="123-456-789"
                                   class="px-4 py-2 border border-gray-200 w-full placeholder:text-xs rounded-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Location</label>
                            <input type="text" v-model="customerForm.location" required placeholder="Kampala"
                                   class="px-4 py-2 border border-gray-200 w-full placeholder:text-xs rounded-sm">
                        </div>
                    </div>
                    <div class="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
                        <button type="button" @click="showCustomerForm = false"
                                class="rounded-sm border border-gray-200 bg-gray-500 cursor-pointer px-4 py-3 flex items-center justify-center text-xs text-white">
                            Cancel
                        </button>
                        <button type="submit" :disabled="savingCustomer"
                                class="rounded-sm border border-gray-200 gap-2 cursor-pointer flex items-center justify-center px-4 py-3 bg-green-600 text-xs text-white disabled:opacity-50">
                            <CircleCheck class="w-4 h-4" /> {{ savingCustomer ? 'Saving...' : 'Save' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ============ DELETE CART ITEM DIALOG ============ -->
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div class="w-full max-w-xl rounded-sm bg-white p-5 shadow-sm">
                <div class="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h3 class="text-base font-semibold text-gray-700">Delete Cart item</h3>
                    <button type="button" @click="showDeleteModal = false" class="text-gray-500">
                        <X class="w-4 h-4" />
                    </button>
                </div>

                <p class="mt-2 text-sm text-gray-500">
                    Are you sure you want to delete <strong>{{ cartItemToDelete?.medicine_name }}</strong> from the cart?
                    The quantity goes back into stock.
                </p>
                <div class="mt-4 flex justify-end gap-2 border-t border-gray-200 pt-3">
                    <button type="button" @click="showDeleteModal = false"
                            class="rounded-sm bg-gray-500 px-4 py-2 text-xs text-white">
                        Cancel
                    </button>
                    <button type="button" @click="removeItem" :disabled="deleting"
                            class="rounded-sm bg-red-500 px-4 py-2 text-xs text-white disabled:opacity-50">
                        {{ deleting ? 'Removing...' : 'Yes' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
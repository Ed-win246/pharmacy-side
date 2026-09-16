<script setup>
import { onMounted, reactive, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/lib/api';
import { Plus, ListCheck, CircleCheck, PackageOpen, Trash2 } from 'lucide-vue-next';
import toast from '@tsirosgeorge/toastnotification';

const router = useRouter();
const loading = ref(false);
const saving = ref(false);

const medicines = ref([]);
const categories = ref([]);
const units = ref([]);
const stockItems = ref([]);

const form = reactive({
    category: '',
    unit: '',
    medicine: '',
    buying_price: '',
    quantity: '',
    batch_number: '',
    expiry_date: '',
});

const payment = reactive({
    amount_paid: '',
    supplier: '',
    payment_option: '',
    pay_date: '',
});

const totalAmount = computed(() => {
    return stockItems.value.reduce((sum, item) => sum + Number(item.buying_price), 0);
});

onMounted(async () => {
    await Promise.all([fetchMedicines(), fetchCategories(), fetchUnits()]);
});

async function fetchMedicines() {
    loading.value = true;
    try {
        const { data } = await api.get('/medicines');
        medicines.value = data;
    } catch (error) {
        console.error('Failed to load Products', error);
        toast.error('Failed to load Products. Please try again later');
    } finally {
        loading.value = false;
    }
}

async function fetchCategories() {
    loading.value = true;
    try {
        const { data } = await api.get('/categories');
        categories.value = data;
    } catch (error) {
        console.error('Failed to load Product Categories', error);
        toast.error('Failed to load categories. Please try again later');
    } finally {
        loading.value = false;
    }
}

async function fetchUnits() {
    loading.value = true;
    try {
        const { data } = await api.get('/units');
        units.value = data;
    } catch (error) {
        console.error('Failed to load product units', error);
        toast.error('Failed to load Product Units');
    } finally {
        loading.value = false;
    }
}

function addItemToList() {
    if (!form.category || !form.medicine || !form.unit || !form.buying_price || !form.quantity) {
        toast.error('Please fill in required fields: Category, Product, Unit, Price, Quantity');
        return;
    }

    stockItems.value.push({
        id: Date.now(),
        category: form.category,
        medicine: form.medicine,
        unit: form.unit,
        buying_price: Number(form.buying_price),
        quantity: Number(form.quantity),
        batch_number: form.batch_number || 'N/A',
        expiry_date: form.expiry_date || 'N/A',
    });

    toast.success(`Added ${form.medicine} to stock preview list`);
    resetForm();
}

function resetForm() {
    form.category = '';
    form.unit = '';
    form.medicine = '';
    form.buying_price = '';
    form.quantity = '';
    form.batch_number = '';
    form.expiry_date = '';
}

function removeItem(index) {
    const item = stockItems.value[index];
    stockItems.value.splice(index, 1);
    toast.info(`Removed ${item?.medicine || 'item'} from list`);
}

async function submitStockBatch() {
    if (stockItems.value.length === 0) {
        toast.error('No stock items to submit');
        return;
    }

    saving.value = true;
    try {
        await api.post('/addstock', {
            items: stockItems.value,
            payment: payment,
        });
        toast.success('Stock batch saved successfully!');
        stockItems.value = [];
        router.push('/viewstock');
    } catch (error) {
        console.error('Error saving stock batch:', error);
        toast.error('Failed to save stock batch. Please try again.');
    } finally {
        saving.value = false;
    }
}
</script>
<template>
    <div class="w-full min-h-screen">
        <div class="h-full max-w-7xl max-auto flex flex-col overflow-y-auto space-y-6 pb-10 p-2">
            <div class="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                    <h2 class="font-medium text-sm text-gray-500 uppercase flex items-center gap-2">
                        <ListCheck class="w-4 h-4"/>
                        Add Stock
                    </h2>
                </div>
                <div class="font-medium text-sm">
                    <router-link to="/dashboard" class="cursor-pointer text-black-300">Dashboard</router-link>
                    <span class="text-gray-400"> / Add Stock</span>
                </div>
            </div>
            <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-2 bg-white pl-4 pr-4 pt-4 pb-6">
                <!-- Left Column: Add Stock Form -->
                <div class="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                    <form @submit.prevent="addItemToList" class="space-y-4">
                        <div>
                            <label for="category" class="block text-sm font-medium text-gray-700">Category </label>
                            <select name="category" id="category" v-model="form.category" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                                <option value="">Select option</option>
                                <option v-for="categoryOption in categories" :key="categoryOption.id" :value="categoryOption.Category_name">
                                    {{ categoryOption.Category_name }}
                                </option>
                            </select>
                        </div>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label for="product" class="block text-sm font-medium text-gray-700">Product </label>
                                <select id="product" v-model="form.medicine" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                                    <option value="">Select option</option>
                                    <option v-for="medicine in medicines" :key="medicine.id" :value="medicine.name">
                                        {{ medicine.name }}
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label for="unit" class="block text-sm font-medium text-gray-700">Unit </label>
                                <select id="unit" v-model="form.unit" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                                    <option value="" class="text-gray-400">Select option</option>
                                    <option v-for="unit in units" :key="unit.id" :value="unit.unit_name">
                                        {{ unit.unit_name }}
                                    </option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label for="total-product-price" class="block text-sm font-medium text-gray-700">Total Buying Price </label>
                            <input id="total-product-price" v-model="form.buying_price" type="number" step="0.01" placeholder="0.00" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                        </div>
                        <div class="border-b-2 border-gray-200 pb-4">
                            <label for="quantity" class="block text-sm font-medium text-gray-700">Quantity </label>
                            <input id="quantity" v-model="form.quantity" type="number" min="1" placeholder="1" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                        </div>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label for="batch-number" class="block text-sm font-medium text-gray-700">Batch Number</label>
                                <input id="batch-number" v-model="form.batch_number" type="text" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="BATCH-LM09">
                            </div>
                            <div>
                                <label for="expiry-date" class="block text-sm font-medium text-gray-700">Expiry Date</label>
                                <input id="expiry-date" v-model="form.expiry_date" type="date" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                            </div>
                        </div>
                        <button type="submit" class="w-full bg-green-600 hover:bg-green-700 rounded-sm items-center justify-center flex gap-2 px-4 py-2 text-white font-medium cursor-pointer transition">
                           <CircleCheck class="h-4 w-4 shrink-0" aria-hidden="true" /> Submit
                        </button>
                    </form>
                </div>
                <div>
                    <!-- Empty Placeholder Div -->
                    <div v-if="stockItems.length === 0" class="border-2 border-gray-300 rounded-lg p-10 text-center bg-gray-100 flex flex-col items-center justify-center min-h-[380px] space-y-3">
                        <div class="p-3 bg-gray-100 rounded-full text-gray-400">
                            <PackageOpen class="w-10 h-10 stroke-1 text-green-800" />
                        </div>
                        <h3 class="text-base font-medium text-green-700">No item selected</h3>
                        <p class="text-sm text-gray-500 max-w-xs">
                            Fill out the stock form and submit to preview your added stock items here.
                        </p>
                    </div>
                    <div v-else class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div class="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                            <h3 class="font-medium text-sm text-gray-700 uppercase flex items-center gap-2">
                                <ListCheck class="w-4 h-4 text-green-600" />
                                Added Stock Items ({{ stockItems.length }})
                            </h3>
                            <button @click="stockItems = []" class="text-xs text-red-600 hover:underline cursor-pointer">Clear all</button>
                        </div>

                        <div class="overflow-x-auto max-h-[380px]">
                            <table class="w-full text-left border-collapse text-sm">
                                <thead class="text-gray-600 text-xs sticky top-0">
                                    <tr>
                                        <th class="py-2 px-2">#</th>
                                        <th class="py-2 px-2">Batch / Expiry</th>
                                        <th class="py-2 px-2">Product Name</th>
                                        <th class="py-2 px-2">Unit Name</th>
                                        <th class="py-2 px-2">Total Price</th>
                                        <th class="py-2 px-2 text-center">Remove</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200 text-gray-700">
                                    <tr v-for="(item, index) in stockItems" :key="item.id" class="hover:bg-gray-50">
                                        <td class="py-2 px-3 font-medium">{{ index + 1 }}</td>
                                        <td class="py-2.5 px-3 text-xs">
                                            <div>{{ item.batch_number }}</div>
                                            <div class="text-gray-400">{{ item.expiry_date }}</div>
                                        </td>
                                        <td class="py-2.5 px-3">
                                            <div class="font-medium text-gray-900 text-xs">{{ item.medicine }}</div>
                                            <div class="text-xs text-gray-400">{{ item.category }}</div>
                                        </td>
                                        <td class="py-2.5 px-3">
                                            <div class="font-medium text-xs">{{ item.unit }}</div>
                                            <div class="text-xs text-green-700">Qty:{{ item.quantity }}</div>
                                        </td>
                                        <td class="py-2.5 px-3 text-right font-medium">{{ item.buying_price }}</td>
                                        <td class="py-2.5 px-3 text-center">
                                            <button @click="removeItem(index)" class="rounded hover:bg-red-800 p-1 cursor-pointer bg-red-700 text-white" title="Remove item">
                                                <Trash2 class="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="p-4 border-t border-gray-200 bg-gray-50">
                            <div class="mb-4 text-xs text-gray-500">
                                Total Items:
                                <span class="font-medium text-gray-800">{{ stockItems.length }}</span>
                            </div>
                            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div>
                                    <label for="total" class="block text-sm font-medium text-gray-700">Total</label>
                                    <input
                                        id="total"
                                        :value="totalAmount.toFixed(2)"
                                        type="text"
                                        readonly
                                        class="mt-1 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600"
                                    />
                                </div>
                                <div>
                                    <label for="amount_paid" class="block text-sm font-medium text-gray-700">Amount Paid</label>
                                    <input
                                        id="amount_paid"
                                        v-model="payment.amount_paid"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label for="supplier" class="block text-sm font-medium text-gray-700">Supplier</label>
                                    <input
                                        id="supplier"
                                        v-model="payment.supplier"
                                        type="text"
                                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label for="payment_option" class="block text-sm font-medium text-gray-700">Payment Option</label>
                                    <select
                                        id="payment_option"
                                        v-model="payment.payment_option"
                                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    >
                                        <option value="">Select option</option>
                                        <option value="cash">Cash</option>
                                        <option value="mobile_money">Mobile Money</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="credit">Credit</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="pay-date" class="block text-sm font-medium text-gray-700">Pay Date</label>
                                    <input
                                        id="pay-date"
                                        v-model="payment.pay_date"
                                        type="date"
                                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <button
                                    @click="submitStockBatch"
                                    :disabled="saving"
                                    class="w-full mt-6 flex items-center justify-center gap-2 rounded-sm bg-green-600 px-4 py-2 whitespace-nowrap text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                                    >
                                    <CircleCheck class="h-4 w-4 shrink-0 " aria-hidden="true" />
                                    {{ saving ? 'Saving...' : 'Submit & Exit' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
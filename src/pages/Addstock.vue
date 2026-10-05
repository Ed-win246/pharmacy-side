<script setup>
import { onMounted, reactive, ref, computed, watch, } from 'vue';
import { storeToRefs } from 'pinia';
import api from '@/lib/api';
import { useStockStore } from '@/stores/stockStore';
import {  ListCheck, CircleCheck, PackageOpen, Trash2 } from 'lucide-vue-next';
import toast from '@tsirosgeorge/toastnotification';


//exposing the items in the stockStore
const stockStore = useStockStore();
const {items : stockItems} = storeToRefs(stockStore);

const loading = ref(false);
const saving = ref(false);

const medicines = ref([]);
const categories = ref([]);
const units = ref([]);
const suppliers = ref([]);
const paymentOptions = ref([]);


//paydate from today onwadays
function formatLocalDate(date){
    const year= date.getFullYear();
    const month=String(date.getMonth()+1).padStart(2,'0');
    const day=String(date.getDate()).padStart(2,'0');

    return `${year}-${month}-${day}`;
}
const today=computed(()=>formatLocalDate(new Date()));


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
    paymentOptions: '',
    pay_date: today.value,
});

const totalAmount = computed(() => {
    return stockItems.value.reduce((sum, item) => sum + Number(item.buying_price), 0);
});

onMounted(async () => {
    await Promise.all([fetchMedicines(), fetchCategories(), fetchUnits(), fetchSuppliers(), fetchpaymentOptions()]);
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

const getUnitName = (med) => med?.unit_name || med?.unit?.unit_name || med?.unit?.name || '';

const selectedMedicine = computed(() => {
    return medicines.value.find((m) => m.name === form.medicine) || null;
});

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

async function fetchSuppliers() {
    loading.value = true;
    try {
        const { data } = await api.get('/suppliers');
        suppliers.value = data;
    } catch (error) {
        console.error('Failed to load system suppliers', error);
        toast.error('Failed to load system suppliers');
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

async function fetchpaymentOptions() {
    loading.value = true;
    try {
        const { data } = await api.get('/paymentOptions');
        paymentOptions.value = data;
    } catch (error) {
        console.error('Failed to load payment options', error);
        toast.error('Failed to load payment options');
    } finally {
        loading.value = false;
    }
}

//function to search specific categories to a prdouct.
const filteredMedicines=computed(()=>{
    if(!form.category)  return [];
       // return medicines.value;//show everything if no category is choosen.
    
    return medicines.value.filter(m =>m.category === form.category);
});
//watch the category and product
// watch(()=>form.category,()=>{
//     form.medicine='';
    
// });

// Category changed -> the old product and unit no longer apply
watch(() => form.category, () => {
    form.medicine = '';
    form.unit = '';
});

// Product changed -> require the user to choose a unit
watch(() => form.medicine, () => {
    form.unit = '';
});




async function addItemToList() {
    const buying_price= Number(form.buying_price);
    const quantity= Number(form.quantity);
    if (!form.category || !form.medicine || !form.unit || !Number.isFinite(buying_price)|| buying_price <0 || !Number.isInteger(quantity) || quantity <1) {
        toast.error('Please fill in required fields: Category, Product, Unit, Price, Quantity');
        return;
    }
    if (isPastDate(form.expiry_date)) {//date functionality error log
        toast.error('Expiry date must be after today');
        return;
    }

    stockStore.addItem({
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
//remove one item fromt the list 
function removeItem(index) {
    const item = stockItems.value[index];
    stockStore.removeItem(index);
    toast.info(`Removed ${item?.medicine || 'item'} from list`);
}

//clear items from the store
function clearItems(){
    stockStore.clearItems();
}

async function submitStockBatch() {
    if (stockItems.value.length === 0) {
        toast.error('No stock items to submit');
        return;
    }//update the validate 
    if(!payment.supplier){
        toast.error('Please select a supplier');
        return;
    }
    if(!payment.paymentOptions){
        toast.error('Please select payment option');
        return;
    }

    saving.value = true;
    try {
        await api.post('/stock-items/submit', {
            items: stockItems.value.map((item) => ({
                name: item.medicine,
                unit_name: item.unit,
                category: item.category,
                quantity: Number(item.quantity),
                buying_price: Number(item.buying_price),
                batch_number: item.batch_number === 'N/A' ? null : item.batch_number,
                expiry_date: item.expiry_date === 'N/A' ? null : item.expiry_date,
                supplier:item.supplier || payment.supplier,
                amount_paid: Number(item.amount_paid || payment.amount_paid),
            })),
            payment:{
                supplier: payment.supplier,
                amount_paid: Number(payment.amount_paid) || 0,
                paymentOPtions: payment.paymentOptions,
                pay_date: payment.pay_date,
            }
        });
        toast.success('Stock batch saved successfully!');
        stockStore.clearItems();
    } catch (error) {
        console.error('Error saving stock batch:', error);
        toast.error('Failed to save stock batch. Please try again.');
    } finally {
        saving.value = false;
    }
}
//date functionality
const tomorrow =computed(()=>{
    const date =new Date();
    date.setDate(date.getDate() + 1);

    const year=date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2,'0');
    const day = String(date.getDate()).padStart(2 , '0');

    return `${year}-${month}-${day}`;
    
});
function isPastDate(dateValue){
    if(!dateValue){
        return true;
    }
    return dateValue <tomorrow.value;
}

const canSubmitBatch=computed(()=>{
    return(
        stockItems.value.length >0 &&
        Boolean(payment.supplier) &&
        Boolean(payment.paymentOptions)&&
        !saving.value
    );
});

// names of all units a product can be sold in
function unitsOfMedicine(med) {
    const names = [getUnitName(med)];

    // pack units (e.g. Box), if the backend returns them later
    (med.unit_details || []).forEach((row) => {
        const unit = units.value.find((u) => Number(u.id) === Number(row.unit_id));
        if (unit) names.push(unit.unit_name);
    });

    return names.filter(Boolean);
}

const availableUnits = computed(() => {
    if (!form.category) return [];   // no category yet -> empty list

    // a product is chosen -> only that product's units
    if (selectedMedicine.value) {
        return [...new Set(unitsOfMedicine(selectedMedicine.value))];
    }

    // only a category is chosen -> units used by any product in that category
    return [...new Set(filteredMedicines.value.flatMap(unitsOfMedicine))];
});

//logic to capture base quantity
const unitNameById = (id) =>units.value.find((u)=>Number(u.id) === Number(id))?. unit_name//find unit name by id

const smallestUnitName=computed(()=>getUnitName(selectedMedicine.value));
//how many smallest units are inside that chosen unit
const baseQuantity=computed(()=>{
  const med= selectedMedicine.value;
  if(!med || !form.unit) return null;

  if(form.unit === getUnitName(med)) return 1;

  //otherwise find the unit row whose name matches
  const row = (med.unit_details || []).find((r)=>unitNameById(r.unit_id)===form.unit);
  return row ? Number(row.quantity):null;
})

//base units logic
const baseUnits=computed(()=>{
    const qty = Number(form.quantity);
    return baseQuantity.value && qty > 0 ? qty*baseQuantity.value : 0;
});

const pricePerBaseUnit=computed(()=>{
    const price= Number(form.buying_price);

    return baseUnits.value && price > 0 ? price/baseUnits.value : 0;
})
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
                                <select
                                    id="product"
                                    v-model="form.medicine"
                                    class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    >
                                    <option value="">Select option</option>
                                    <option v-if="filteredMedicines.length === 0" value="" disabled>List is empty</option>
                                    <option v-for="medicine in filteredMedicines" :key="medicine.id" :value="medicine.name">
                                        {{ medicine.name }}
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label for="unit" class="block text-sm font-medium text-gray-700">Unit </label>
                                <select
                                    id="unit"
                                    v-model="form.unit"
                                    class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    >
                                    <option value="">Select option</option>
                                    <option v-if="availableUnits.length === 0" value="" disabled>List is empty</option>
                                    <option v-for="unitName in availableUnits" :key="unitName" :value="unitName">
                                        {{ unitName }}
                                    </option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <div class="mb-1 flex items-center justify-between gap-2">
                                <label for="total-product-price" class="text-sm font-medium text-gray-700">Total Buying Price</label>
                                <span class="text-sm text-red-500 italic">
                                    Base Quantity: {{ baseQuantity ? `${baseQuantity} ${smallestUnitName}` : '—' }}
                                </span>
                            </div>
                            <input id="total-product-price" v-model="form.buying_price" type="number" step="1" min="1" placeholder="1" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" required>
                        </div>

                        <div>
                            <div class="mb-1 flex items-center justify-between gap-2">
                                <label for="quantity" class="text-sm font-medium text-gray-700">Quantity</label>
                                <span class="text-sm text-red-500 italic">
                                    Sell per smallest unit: {{ pricePerBaseUnit ? pricePerBaseUnit.toFixed(2) : '—' }}
                                </span>
                            </div>
                            <input id="quantity" v-model.number="form.quantity" type="number" min="1" placeholder="1" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                        </div>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label for="batch-number" class="block text-sm font-medium text-gray-700">Batch Number</label>
                                <input id="batch-number" v-model="form.batch_number" type="text" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="BATCH-LM09">
                            </div>
                            <div>
                                <label for="expiry-date" class="block text-sm font-medium text-gray-700">Expiry Date</label>
                                <input id="expiry-date" v-model="form.expiry_date" type="date" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" :min="tomorrow ">
                            </div>
                        </div>
                        <button type="submit" class="w-full bg-green-600 hover:bg-green-700 rounded-sm items-center justify-center flex gap-2 px-4 py-2 text-white font-medium cursor-pointer transition">
                           <CircleCheck class="h-4 w-4 shrink-0" aria-hidden="true" /> Submit
                        </button>
                    </form>
                </div>
                <div>
                    <div v-if="stockItems.length === 0" class="border-2 border-gray-300 rounded-lg p-10 text-center bg-gray-100 flex flex-col items-center justify-center min-h-[380px] space-y-3">
                        <div class="p-3 bg-gray-100 rounded-full text-gray-400">
                            <PackageOpen class="w-10 h-10 stroke-1 text-green-800" />
                        </div>
                        <h3 class=" font-medium text-green-700 text-xl">No item selected</h3>
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
                            <button @click="clearItems" class="text-xs text-red-600 hover:underline cursor-pointer">Clear all</button>
                        </div>
                        <div class="overflow-x-4 max-h-[380px] ">
                            <table class="w-full text-left border-collapse text-sm overflow-auto">
                                <thead class="text-gray-600 text-xs sticky top-0">
                                    <tr>
                                        <th class="py-2 px-2">#</th>
                                        <th class="py-2 px-2">Batch Level</th>
                                        <th class="py-2 px-2">Product Name</th>
                                        <th class="py-2 px-2">Unit Name</th>
                                        <th class="py-2 px-2">Total Price</th>
                                        <th class="py-2 px-2 text-center">Remove</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200 text-gray-700">
                                    <tr v-for="(item, index) in stockItems" :key="item.id" class="hover:bg-gray-50">
                                        <td class="py-2 px-2 font-medium">{{ index + 1 }}</td>
                                        <td class="py-2 px-2 text-xs">
                                            <div>{{ item.batch_number }}</div>
                                            <div class="text-gray-400">{{ item.expiry_date }}</div>
                                        </td>
                                        <td class="py-2 px-2">
                                            <div class="font-medium text-gray-900 text-xs">{{ item.medicine }}</div>
                                            <div class="text-xs text-gray-400">{{ item.category }}</div>
                                        </td>
                                        <td class="py-2 px-2">
                                            <div class="font-medium text-xs">{{ item.unit }}</div>
                                            <div class="text-xs text-green-700">Qty:{{ item.quantity }}</div>
                                        </td>
                                        <td class="py-2 px-2  font-medium">{{ item.buying_price }}</td>
                                        <td class="py-2 px-2 text-center">
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
                                        min="1"
                                        step="1"
                                        placeholder="0"
                                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label for="supplier" class="block text-sm font-medium text-gray-700">Supplier</label>
                                    <select
                                        id="supplier"
                                        v-model="payment.supplier"
                                        type="text"
                                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    >
                                        <option value="">Select option..</option>
                                        <option v-for="supplierOption in suppliers" :key="supplierOption.name" :value="supplierOption.name">
                                            {{ supplierOption.name }}
                                        </option>
                                    </select>
                                </div>
                                <div>
                                    <label for="paymentOptions" class="block text-sm font-medium text-gray-700">Payment Option</label>
                                    <select
                                        id="payment_option"
                                        v-model="payment.paymentOptions"
                                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    >
                                    <option value="" >select option</option>
                                    <option v-for="payopt in paymentOptions" :key="payopt.name" :value="payopt.name">
                                        {{ payopt.name }}
                                    </option>
                                    </select>
                                </div>
                                <div>
                                    <label for="pay-date" class="block text-sm font-medium text-gray-700">Pay Date</label>
                                    <input
                                        id="pay-date"
                                        v-model="payment.pay_date"
                                        type="date"
                                        :min="today"
                                        class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <button
                                    @click="submitStockBatch"
                                    :disabled="!canSubmitBatch"
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
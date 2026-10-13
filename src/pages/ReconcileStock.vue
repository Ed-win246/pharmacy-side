<script setup>
import {ref, reactive, onMounted,computed} from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import {  SquarePen, X,Trash2,  CircleCheck} from 'lucide-vue-next';

const stockLevels = ref([]);
const loading = ref(false);
const formatMoney = (value) => Number(value || 0).toLocaleString();

// const openReconcileModal = ()=>{};

onMounted(fetchStockLevels);

async function fetchStockLevels(){
    loading.value = true;

    try{
        const {data} = await api.get('/stock-levels');
        stockLevels.value = data;
    }catch(error){
        console.error('Failed to fetch batch levels',error);
        toast.error('Failed to fetch stock levels');
    }finally{
        loading.value = false;
    }
}

const byExpiry = (a,b)=> String(a.expiry_date ?? '9999').localeCompare(String(b.expiry_date ?? '9999'));

//one entry per product, holding all the batches
const products=computed(()=>{
    const groups= {};

    stockLevels.value.forEach((level)=>{
        const name = String(level.medicine_name ?? '').trim() || 'unknown';
        const key = name.toLowerCase();


        if(!groups[key]){
            groups[key] = {
                key, name, category:level.category, batches :[],
            }
        }
        if(!groups[key].category && level.category){
            groups[key].category = level.category;
        }
        groups[key].batches.push(level);//stores the batch numbers so changing one changins the batch level in stock levels
    });

    Object.values(groups).forEach((g)=>g.batches.sort(byExpiry));
    return Object.values(groups).sort((a,b)=>a.name.localeCompare(b.name));
});
//key is the lowercase trimmed , so Para and para are treated as one 

const productRows = computed(()=>{
    return products.value.map((p)=>({
        key:p.key,
        name:p.name || p.medicine_name,
        category:p.category,
        added_by: p.batches.find((b)=>b.added_by)?.added_by ?? '-',
        batches_count:p.batches.length,
        total_price:p.batches.reduce((sum, b)=> sum + Number(b.buying_price || 0), 0)
    }));
});

const hasValue = (v) => v !== undefined && v !== null && v !== '';

function localDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
const todayString = () => localDateString(new Date());

function tomorrowString() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return localDateString(d);
}

// "2027-03-01" and "2027-03-01T00:00:00.000000Z" both become "2027-03-01"
const dateOnly = (value) => (value ? String(value).slice(0, 10) : '');

// Text dates in YYYY-MM-DD order sort exactly like real dates, so a text comparison is enough.
// Expiring today still counts as not yet expired (same rule as Batch Levels).
const isExpired = (value) => !!value && dateOnly(value) < todayString();

// Same colours as Batch Levels: red = expired, light orange = not yet expired
const expiryStyle = (value) => {
    if (!value) return { color: '#9ca3af' };
    return isExpired(value)
        ? { backgroundColor: '#fee2e2', color: '#dc2626' }
        : { backgroundColor: '#ffedd5', color: '#f97316' };
};

const inputClass = 'rounded-sm border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none ';


//reconcile tabs and logic
const tabs=[
    {key:'update',label:'Update'},
    {key:'addstock',label:'Add stock'}
]

const showModal=ref(false);
const activeTab = ref('update');
const selected = ref(null);//key,name,category captured when the modal opens
const actualStock = ref({});//batchid, typed number
const expiryDates = ref({});//batchid, edited expiry date
const savingExpiryId = ref(null);
const newBatches = ref([]);//batches for the add stock tab
const batchToDelete = ref(null);
const activatingId = ref(null);
let tempId = -1;

//live batches for the selected products
const selectedBatches = computed(()=>products.value.find((p)=>p.key === selected.value?.key)?.batches??[]);


function blankRow(){
   return {tempId:tempId--, batch_number:'',quantity:'',buying_price:'',expiry_date:''}
}

function openReconcileModal(key){
    const product = products.value.find((p) =>p.key === key);
    if(!product ) return;
    
    selected.value = {key:product.key, name:product.name};
    activeTab.value = 'update';
    actualStock.value = {};
    expiryDates.value = Object.fromEntries(
        product.batches.map((batch) => [batch.id, dateOnly(batch.expiry_date)])
    );
    newBatches.value = [blankRow()];
    batchToDelete.value = null;
    showModal.value = true;
}

async function saveExpiryDate(batch){
    savingExpiryId.value = batch.id;

    try{
        const expiryDate = expiryDates.value[batch.id] || null;
        await api.put(`/stock-levels/${batch.id}`, {expiry_date: expiryDate});
        stockLevels.value = stockLevels.value.map((level) =>
            level.id === batch.id ? {...level, expiry_date: expiryDate} : level
        );
        toast.success('Expiry date updated successfully');
    }catch(error){
        console.error('Failed to update expiry date', error);
        toast.error('Failed to update expiry date');
    }finally{
        savingExpiryId.value = null;
    }
}

function closeModal(){
    showModal.value =  false;
    selected.value = null;
}

const showDeleteModal = ref(false);
function deleteModal(batch){
    batchToDelete.value = batch;
    showDeleteModal.value = true;
}

function closeDeleteModal(){
    showDeleteModal.value = false;
    batchToDelete.value = null;
}
</script>
<template>
    <div class="min-h-screen w-full">
        <div class=" h-full  flex flex-col pb-10 p-2">
            <div class="flex items-center justify-between  p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">Reconcile Stock</h2>
                </div>
                    <div class="font-medium text-sm">
                        <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                        <span class="text-gray-400">/ Reconcile Stock</span>
                    </div>
            </div>

            <div class="mt-2 bg-white shadow-sm overflow-x-auto rounded-sm">
                <table class="w-full text-sm text-left">
                    <thead class="tracking-wider border-b border-gray-200 text-sm">
                        <tr>
                            <th class="px-4 py-3 font-medium">#</th>
                            <th class="px-4 py-3 font-medium">Product</th>
                            <th class="px-4 py-3 font-medium">Category</th>
                            <th class="px-4 py-3 font-medium">Batches</th>
                            <th class="px-4 py-3 font-medium">Price</th>
                            <th class="px-4 py-3 font-medium">Added By</th>
                            <th class="px-4 py-3 font-medium">Reconcile</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 text-gray-500">
                        <tr v-if="loading">
                            <td class="px-4 py-12 text-center" colspan="8">
                                Loading products....
                            </td>
                        </tr>
                        <tr v-else-if="productRows.length === 0">
                            <td class="px-4 py-12 text-center " colspan="8">
                                No data found to reconcile...
                            </td>
                        </tr>
                        <tr v-for="(row, index) in productRows" :key="row.key" class="text-xs">
                            <td class="px-4 py-3 font-medium">{{ index + 1 }}</td>
                            <td class="px-4 py-3 font-medium">{{ row.name || row.medicine_name }}</td>
                            <td class="px-4 py-3 font-medium">{{ row.category }}</td>
                            <td class="px-4 py-3 font-medium">{{ row.batches_count }}</td>
                            <td class="px-4 py-3 font-medium">{{ formatMoney(row.total_price)}}</td>
                            <td class="px-4 py-3 font-medium">{{ row.added_by }}</td>
                            <td class="px-4 py-3">
                                <button @click="openReconcileModal(row.key)"
                                    type="button"
                                    class="rounded-sm bg-[#0b0b45] p-2 text-white cursor-pointer"
                                    :aria-label="`Reconcile ${row.name}`"
                                >
                                    <SquarePen class="w-3 h-3 shrink-0" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-if="showModal && selected" class="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4">
                <div class="bg-white max-w-6xl w-full max-h-[80vh] overflow-y-auto shadow-sm p-5 space-y-4 rounded-sm">
                    <div class="flex items-center justify-between border-b border-gray-200 pb-3">
                        <div>
                            <h3 class="text-sm font-semibold tracking-wider text-gray-700">Reconcile Quantities for: {{ selected.name }}</h3>
                        </div>
                        <button @click="closeModal"
                        type="button"
                        class="text-gray-400 cursor-pointer"><X class="w-4 h-4"/>
                        </button>
                    </div>

                    <!--tabs-->
                    <div class="flex w-full">
                        <button v-for="tab in tabs" :key="tab.key"
                            type="button"
                            @click="activeTab = tab.key"
                            class="flex-1 border-b-3 py-3 text-center text-sm font-medium tracking-wide cursor-pointer"
                            :class="activeTab === tab.key
                                ? 'border-b border-green-500 text-gray-700 text-xl'
                                : 'border-transparent text-gray-400'"
                        >
                            {{ tab.label }}
                        </button>
                    </div>

                    <!--body-->
                    <div class="flex-1 overflow-y-auto p-5">
                        <table v-if="activeTab === 'update'" class="w-full text-left text-sm">
                            <thead class="border-b border-gray-200 tracking-wide text-gray-600">
                                <tr>
                                    <th class="px-3 py-2 font-medium">Batch</th>
                                    <th class="px-3 py-2 font-medium">Current Stock</th>
                                    <th class="px-3 py-2 font-medium">Actual Stock</th>
                                    <th class="px-3 py-2 font-medium">Expiry Date</th>
                                    <th class="px-3 py-2 font-medium">Buy Price /<span class="text-xs">small unit</span></th>
                                    <th class="px-3 py-2 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="selectedBatches.length === 0">
                                    <td class="px-4 py-12 text-center " colspan="6">
                                        No batches for this product. Click Add Stock to add one..
                                    </td>
                                </tr>
                                <tr v-for="batch in selectedBatches" :key="batch.id">
                                    <td class="px-3 py-2 font-medium">
                                        <div class="border-2 border-gray-400 rounded-sm flex items-center gap-2 px-2 py-1 bg-gray-100 text-gray-500">{{ batch.batch_number }}</div>
                                    </td>
                                    <td class="px-3 py-2 font-medium">
                                        <div class="flex items-center gap-2 rounded-sm border-2 border-gray-400 bg-gray-100 px-2 py-1 text-gray-500">{{ batch.quantity }}</div>
                                    </td>
                                    <td class="px-3 py-2">
                                        <div class="flex items-center gap-2">
                                            <input type="number" min="0"
                                            v-model="actualStock[batch.id]"
                                            :placeholder="String(batch.quantity)"
                                            :class="[inputClass, 'w-36 text-center']"/>
                                        </div>
                                    </td>
                                    <td class="px-3 py-2">
                                        <div class="flex items-center gap-2">
                                            <input
                                                v-model="expiryDates[batch.id]"
                                                type="date"
                                                :class="[inputClass, 'w-40']"
                                                :aria-label="`Expiry date for batch ${batch.batch_number}`"
                                            />
                                        </div>
                                    </td>
                                    <td class="px-3 py-2">
                                        <div class="flex items-center gap-2">
                                            <input type="number"
                                            v-model="batch.buying_price"
                                            :class="[inputClass,'w-36']"/>
                                        </div>
                                    </td>
                                    <td class="px-3 py-2">
                                        <div class="flex items-center gap-2">
                                            <button @click="activateBatch(batch)" type="button"
                                                :disabled="batch.is_active || activatingId === batch.id"
                                                :aria-label="batch.is_active ? `Activated ${batch.batch_number}` : `Activate ${batch.batch_number}`"
                                                :title="batch.is_active ? 'Activated' : activatingId === batch.id ? 'Activating...' : 'Activate batch'"
                                                class="inline-flex items-center justify-center rounded-sm p-2 transition-colors"
                                                :class="batch.is_active
                                                    ? 'cursor-default bg-green-100 text-green-700'
                                                    : 'cursor-pointer bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'">
                                                <CircleCheck class="h-4 w-4" />
                                            </button>
                                            <button @click="deleteModal(batch)" type="button"
                                                :aria-label="`Delete batch ${batch.batch_number}`"
                                                class="inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-red-600 p-2 font-medium text-white hover:bg-red-700">
                                                <Trash2 class="h-3.5 w-3.5" /> 
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div v-else>
                            <table class="w-full text-left text-sm">
                                <thead class="border-b border-gray-200 tracking-wide text-gray-600">
                                    <tr>
                                        <th class="px-3 py-2 font-medium">Batch</th>
                                        <th class="px-3 py-2 font-medium">Current Stock</th>
                                        <th class="px-3 py-2 font-medium">Expiry Date</th>
                                        <th class="px-3 py-2 font-medium">Buy Price/ <span class="text-xs">small unit</span></th>
                                        <th class="px-3 py-2 font-medium">Actions</th>
                                    </tr>
                                </thead>
                            </table>
                        </div>

                    </div>
                    
                </div>
                
            </div>
            <div
                v-if="showDeleteModal && batchToDelete"
                class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-md"
                role="presentation"
                @click.self="closeDeleteModal"
            >
                <div
                    class="w-full max-w-md space-y-4 rounded-sm bg-white p-5 shadow-xl"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-batch-title"
                >
                    <div class="flex items-center justify-between border-b border-gray-200 pb-3">
                        <h3 id="delete-batch-title" class="text-lg font-medium">Delete Item Unit</h3>
                        <button
                            @click="closeDeleteModal"
                            type="button"
                            aria-label="Close delete dialog"
                            class="cursor-pointer text-gray-400 hover:text-gray-700"
                        >
                            <X class="h-4 w-4" />
                        </button>
                    </div>
                    <p class="text-sm text-gray-600">
                        Are you sure you want to delete batch
                        <span class="font-semibold text-gray-900">{{ batchToDelete.batch_number || 'without a batch number' }}</span>?
                    </p>
                    <div class="flex justify-end">
                        <button
                            @click="closeDeleteModal"
                            type="button"
                            class="rounded-sm border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
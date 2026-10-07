<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { Banknote, Check, Eye, X, ChevronsLeft, ChevronsRight,Search } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { usePurchaseStore } from '@/stores/purchaseStore';


const store = usePurchaseStore();
const { purchases, paymentOptions, paying, loading, details } = storeToRefs(store);

//const purchases = ref([]);
//const loading = ref(false);
//const paying = ref(false);
const loggedUser = ref(null);

const showPayModal = ref(false);
const showViewModal = ref(false);
const selected = ref(null);
//const details = ref(null);

const payForm = reactive({ amount: '', payment_option: '', pay_date: '' });

//pagination state
const page=ref(1);
const perPage=ref(10);
const lastPage=ref(1);
const total=ref(0);
const from = ref(0);
const to= ref(0);
const perPageOptions=[10,25,50,100,150,200];


//search state
const searchQuery=ref('');
const filteredPurchase = computed(()=>{
    if(!searchQuery.value.trim()){
        return purchases.value;
    }
    const query = searchQuery.value.trim().toLocaleLowerCase();
    return purchases.value.filter(p=>
        String(p.supplier || '').toLocaleLowerCase().includes(query)
    );
});


try {
    loggedUser.value = JSON.parse(localStorage.getItem('user') || 'null');
} catch {
    loggedUser.value = null;
}

// helpers that were missing
const money = (v) => Number(v || 0).toLocaleString();

function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// accept either column naming so the table never shows blanks
const totalOf = (p) => p.total_buy_price ?? p.total_amount ?? 0;
const dateOf = (p) => p.date_added ?? p.pay_date ?? p.created_at?.slice(0, 10) ?? '';

function getAddedBy(purchase) {
    return (
        purchase.added_by_user?.name ||
        purchase.addedBy?.name ||
        purchase.addedBy?.email ||
        purchase.addedByName ||
        loggedUser.value?.name ||
        loggedUser.value?.email ||
        'Not available'
    );
}

onMounted(() => {
    void fetchPurchases();//loads the purchases while the page loads, the page can continue while the request runs
    void store.fetchPaymentOptions();//loads options so they can be available at the dropdown.
});


async function fetchPurchases() {
    loading.value = true;
    try {
        const { data } = await api.get('/purchases', {
            params: {
                page: page.value,
                per_page: perPage.value,
            },
        });

        const payload = data && typeof data === 'object' ? data : {};
        purchases.value = Array.isArray(data) ? data : (Array.isArray(payload.data) ? payload.data : []);
        lastPage.value = payload.last_page ?? 1;
        total.value = payload.total ?? purchases.value.length;
        from.value = payload.from ?? 0;
        to.value = payload.to ?? purchases.value.length;

        if (page.value > lastPage.value && lastPage.value > 0) {
            page.value = lastPage.value;
            return fetchPurchases();
        }
    } catch (error) {
        console.error('Failed to fetch stock purchases', error);
        toast.error('Failed to fetch stock purchases');
    } finally {
        loading.value = false;
    }
}

function goTo(p){
    if(p<1 || p > lastPage.value || p === page.value) return;
        page.value =  p;
        fetchPurchases();
}

//show n entries per page 
watch(perPage, ()=>{
    page.value = 1;
    fetchPurchases();
});

//windowed buttons for pagination 1...4 5 6...40
const PageNumbers = computed(()=>{
    const last = lastPage.value;
    const current =    page.value;
    const pages =  [];
    for(let i=1; i<=last;i++){
        if(i === 1 || i ===last || (i >= current -2 && i <= current + 2)){
            pages.push(i);
        }else if(pages[pages.length - 1] !== '...'){
            pages.push('...');
        }
    }
    return pages;
})

function openPayModal(purchase) {
    selected.value = purchase;
    payForm.amount = purchase.balance;
    payForm.payment_option = '';
    payForm.pay_date = todayLocal();
    showPayModal.value = true;
}

async function openView(purchase) {
    try {
        const { data } = await api.get(`/purchase/${purchase.id}`);
        details.value = data && typeof data === 'object' ? data : {};
        showViewModal.value = true;
    } catch (error) {
        console.error('Failed to load purchase', error);
        toast.error('Failed to load stock purchase');
    }
}

const payInvalid = computed(() => {
    const amt = Number(payForm.amount);
    return !selected.value || !Number.isFinite(amt) || amt <= 0
        || amt > Number(selected.value.balance) || !payForm.payment_option;
});

async function submitPayment() {
    if (payInvalid.value) {
        toast.error('Please enter a valid amount (not above balance) to make payment');
        return;
    }
    paying.value = true;
    try {
        const response = await api.post(`/purchases/${selected.value.id}/payments`, {
            amount_paid: Number(payForm.amount),
            payment_option: payForm.payment_option,
            pay_date: payForm.pay_date,
        });

        if (response?.status === 204 || response?.status === 200) {
            toast.success('Payment recorded successfully');
        }

        showPayModal.value = false;
        await fetchPurchases();
    } catch (error) {
        console.error('Failed to submit payment', error);
        toast.error('Failed to submit payment');
    } finally {
        paying.value = false;
    }
}

function closePayModal() {
    showPayModal.value = false;
}
</script>

<template>
    <div class="min-h-screen w-full">
        <div class="flex flex-col pb-10 p-2">
            <div class="flex items-center justify-between p-4">
                <h2 class="font-medium text-sm flex items-center uppercase gap-2">View Stock Purchases</h2>
                <div class="font-medium text-sm">
                    <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                    <span class="text-gray-400"> / Purchases</span>
                </div>
            </div>

            <div class="mt-2 bg-white overflow-x-auto rounded-md shadow-sm">
                <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center justify-start p-4 text-xs text-gray-600">
                        <label class="items-center gap-2 flex">Show</label>
                        <select v-model.number="perPage" class="gap-2 border border-gray-300 text-xs font-medium px-2 py-1 rounded-sm">
                            <option v-for="n in perPageOptions" :key="n" :value="n">{{ n }}</option>
                        </select>
                        entries
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-medium text-xs whitespace-nowrap" >Search:</span>
                        <div class="relative w-full max-w-[200px] pl-2 m-2">
                            <Search class="absolute -translate-y-1/2 left-3 top-1/2 w-4 h-4 text-gray-300"/>
                            <input type="text"
                            v-model="searchQuery"
                            placeholder="Search..."
                            class=" text-xs pl-9 w-full pr-9 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-green-500 outline-none ">
                            <button
                            v-if="searchQuery"
                            @click="searchQuery=''"
                            type="button"
                            class="absolute -translate-y-1/2 right-3 top-1/2 h-6 w-6 flex items-center justify-center text-gray-300 cursor-pointer"
                            aria-label="clear search"><X class="w-4 h-4"/></button>
                        </div>
                    </div>
                </div>
                <table class="w-full text-sm text-left ">
                    <thead class="tracking-wide text-black border-b border-gray-200">
                        <tr>
                            <th class="px-2 py-2 font-medium">#</th>
                            <th class="px-2 py-2 font-medium">Purchase ID</th>
                            <th class="px-2 py-2 font-medium">Total Buy Price</th>
                            <th class="px-2 py-2 font-medium">Balance</th>
                            <th class="px-2 py-2 font-medium">Supplier</th>
                            <th class="px-2 py-2 font-medium">Date added</th>
                            <th class="px-2 py-2 font-medium">Added by</th>
                            <th class="px-2 py-2 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 text-gray-500">
                        <tr v-if="purchases.length===0">
                            <td class="px-4 py-12 text-center text-gray-400" colspan="8">
                                No purchases found
                            </td>
                        </tr>
                        <tr v-else-if="!filteredPurchase.length ">
                            <td class="px-4 py-12 text-center text-gray-400 text-xs" colspan="8">
                                No purchase matches your "{{ searchQuery }}"
                            </td>
                        </tr>
                        <tr v-for="(p, index) in filteredPurchase" :key="p.id">
                            <td class="px-2 py-2 font-medium">{{(page -1 )* perPage +  index + 1 }}</td>
                            <td class="px-2 py-2 font-medium">{{ p.purchase_id ?? p.id }}</td>
                            <td class="px-2 py-2 font-medium">{{ money(totalOf(p)) }}</td>
                            <td class="px-2 py-2">
                                <span v-if="Number(p.balance)">{{ money(p.balance) }}</span>
                                <button
                                    v-if="Number(p.balance)"
                                    @click="openPayModal(p)"
                                    type="button"
                                    class="flex items-center gap-2 px-2 py-1 rounded-sm bg-[#0b0b45] text-white cursor-pointer"
                                >
                                    <Banknote class="w-4 h-4" />Pay
                                </button>
                                <span v-else class="inline-flex items-center gap-1 font-medium text-xs text-green-700">
                                    <Check class="h-4 w-4" aria-hidden="true" />
                                    Cleared
                                </span>
                            </td>
                            <td class="px-2 py-2 font-medium">{{ p.supplier }}</td>
                            <td class="px-2 py-2 font-medium">{{ dateOf(p) }}</td>
                            <td class="px-2 py-2 font-medium">{{ getAddedBy(p) }}</td>
                            <td class="px-2 py-2 font-medium">
                                <button
                                    @click="openView(p)"
                                    type="button"
                                    class="px-2 py-2 text-white rounded-sm bg-[#0b0b45]  cursor-pointer whitespace-nowrap flex items-center gap-2 text-xs"
                                >
                                    <Eye class="w-4 h-4 shrink-0" />View
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div class="flex items-center justify-between p-3 text-xs">
                    <span class="text-gray-500">Total: {{ total }} purchases</span>
                    <!-- <div class="flex items-center gap-2">
                        <span>Page {{ page }} of {{ lastPage }}</span>
                        <button
                            v-for="pageNumber in pageNumbers"
                            :key="pageNumber"
                            @click="goTo(pageNumber)"
                            :aria-current="pageNumber === page ? 'page' : undefined"
                            :class="[
                                'h-7 min-w-7 rounded-full items-center justify-center flex border px-2 text-xs cursor-pointer',
                                pageNumber === page
                                    ? 'border-green-600 bg-green-600 text-white'
                                    : 'border-gray-300 hover:bg-gray-100',
                            ]"
                        >
                            {{ pageNumber }}
                        </button>
                    </div> -->
                    <div class="flex items-center gap-1">
                        <button @click="goTo(page -1)" :disabled="page === 1" 
                        class="  hover:bg-gray-100 flex items-center justify-center p-1 text-[2px]">
                            <ChevronsLeft class="w-4 h-4" />
                        </button>
                        <template v-for="(n, i) in PageNumbers" :key="i">
                            <span v-if="n === '...'" class="text-gray-200 px-1">...</span>
                            <button @click="goTo(n)" v-else
                            :aria-current="n === page ? 'page' :undefined"
                            :class="[
                                    'h-7 min-w-7 rounded-full flex items-center justify-center border px-2 text-xs cursor-pointer',
                                    n === page ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 hover:bg-gray-100',
                            ]">{{ n }}</button>
                        </template>
                        <button @click="goTo(page + 1)" :disabled="page === 1" 
                        class="  hover:bg-gray-100 flex items-center justify-center p-1 text-[2px]">
                            <ChevronsRight class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <!-- pay modal -->
            <div v-if="showPayModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div class="w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-lg bg-white p-5 space-y-4 shadow-sm">
                    <div class="flex items-center justify-between border-b border-gray-200 pb-3">
                        <h2 class="font-medium text-sm">Balance Payment</h2>
                        <button @click="closePayModal" class="text-gray-400 cursor-pointer"><X class="w-4 h-4" /></button>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Balance To Pay</label>
                        <input type="number" v-model="payForm.amount" min="1" :max="selected?.balance" class="mt-2 rounded-md border border-gray-400 px-3 py-2 w-full">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Payment Method</label>
                        <select v-model="payForm.payment_option" class="mt-2 rounded-md border border-gray-400 py-2 px-3 w-full">
                            <option value="">Select option</option>
                            <option v-for="opt in paymentOptions" :key="opt.name" :value="opt.name">{{ opt.name }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Pay Date</label>
                        <input type="date" v-model="payForm.pay_date" class="mt-2 rounded-md border border-gray-400 px-3 py-2 w-full">
                    </div>
                    <div class="flex flex-col-reverse justify-end gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center">
                        <button @click="closePayModal" type="button" class="w-full rounded-sm bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 sm:w-auto">
                            Cancel
                        </button>
                        <button
                            type="button"
                            @click="submitPayment"
                            :disabled="payInvalid || paying"
                            class="flex w-full items-center justify-center gap-2 rounded-sm bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 sm:w-auto">
                            {{ paying ? 'Submitting...' : 'Submit' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- view modal -->
            <div v-if="showViewModal && details" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div class="w-full max-w-3xl rounded-lg bg-white p-5 space-y-6 max-h-[90vh] overflow-y-auto">
                    <div class="flex items-center justify-between">
                        <h3 class="font-medium text-sm uppercase">Details for Trans-{{ String(details.id).padStart(4, '0') }}</h3>
                        <button @click="showViewModal = false"><X class="w-4 h-4" /></button>
                    </div>
                    <table class="w-full text-xs text-left">
                        <thead class="border-b border-gray-300">
                            <tr>
                                <th class="px-2 py-2 font-medium">#</th>
                                <th class="px-2 py-2 font-medium">Product</th>
                                <th class="px-2 py-2 font-medium">Quantity</th>
                                <th class="px-2 py-2 font-medium">Unit</th>
                                <th class="px-2 py-2 font-medium">Price</th>
                                <th class="px-2 py-2 font-medium">Batch</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <tr v-for="(item, index) in details.items" :key="item.id">
                                <td class="px-2 py-2 font-medium">{{ index + 1 }}</td>
                                <td class="px-2 py-2 text-xs">
                                    <div>{{ item.medicine_name  }}</div>
                                    <div class="text-green-600">{{ item.category }}</div>
                                </td>
                                 <td class="px-2 py-2 text-xs">{{ item.quantity }}</td>
                                <td class="px-2 py-2 text-xs">{{ item.unit_name ?? item.unit }}</td>
                                <td class="px-2 py-2 text-xs">{{ money(item.buying_price) }}</td>
                                <td class="px-2 py-2 text-xs">
                                    <div>{{ item.batch_number || 'N/A' }}</div>
                                    <div class="text-green-600">{{ item.expiry_date || 'N/A' }}</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="flex justify-end border-t border-gray-200 pt-3">
                        <button
                            @click="showViewModal = false"
                            type="button"
                            class="rounded-sm bg-gray-600 px-4 py-2 text-sm font-medium text-white cursor-pointer hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
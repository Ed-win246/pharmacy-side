<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { Eye, Wallet, X } from 'lucide-vue-next';

const purchases = ref([]);
const paymentOptions = ref([]);
const loading = ref(false);
const paying = ref(false);
const loggedUser = ref(null);

const showPayModal = ref(false);
const showViewModal = ref(false);
const selected = ref(null);
const details = ref(null);

const payForm = reactive({ amount: '', payment_option: '', pay_date: '' });

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

onMounted(async () => {
    await Promise.all([fetchPurchases(), fetchPaymentOptions()]);
});

async function fetchPurchases() {
    loading.value = true;
    try {
        const { data } = await api.get('/purchases');
        purchases.value = Array.isArray(data) ? data : (data.data ?? []);
    } catch (error) {
        console.error('Failed to fetch stock purchases', error);
        toast.error('Failed to fetch stock purchases');
    } finally {
        loading.value = false;
    }
}

async function fetchPaymentOptions() {
    try {
        const { data } = await api.get('/paymentOptions');
        paymentOptions.value = data;
    } catch (error) {
        console.error('Failed to load payment options', error);
        toast.error('Failed to load payment options');
    }
}

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
        details.value = data;
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
        await api.post(`/purchases/${selected.value.id}/payments`, {
            amount: Number(payForm.amount),
            payment_option: payForm.payment_option,
            pay_date: payForm.pay_date,
        });
        toast.success('Payment recorded successfully');
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
        <div class="max-w-7xl max-auto flex flex-col pb-10 p-2">
            <div class="flex items-center justify-between p-4">
                <h2 class="font-medium text-sm flex items-center uppercase gap-2">View Stock Purchases</h2>
                <div class="font-medium text-sm">
                    <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                    <span class="text-gray-400"> / Purchases</span>
                </div>
            </div>

            <div class="mt-2 bg-white overflow-x-auto">
                <table class="w-full text-xs text-left">
                    <thead class="tracking-wide text-black">
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
                    <tbody class="divide-y divide-slate-200">
                        <tr v-if="purchases.length === 0">
                            <td class="px-4 py-12 text-center text-gray-400" colspan="8">No stock purchases yet</td>
                        </tr>
                        <tr v-for="(p, index) in purchases" :key="p.id">
                            <td class="px-2 py-2 font-medium">{{ index + 1 }}</td>
                            <td class="px-2 py-2 font-medium">{{ p.purchase_id ?? p.id }}</td>
                            <td class="px-2 py-2 font-medium">{{ money(totalOf(p)) }}</td>
                            <td class="px-2 py-2">
                                <button
                                    v-if="Number(p.balance)"
                                    @click="openPayModal(p)"
                                    type="button"
                                    class="flex items-center gap-2 px-2 py-1 rounded-sm bg-green-600 text-white cursor-pointer"
                                >
                                    <Wallet class="w-4 h-4" />
                                    {{ money(p.balance) }}
                                </button>
                                <span v-else class="font-medium text-xs">Cleared</span>
                            </td>
                            <td class="px-2 py-2 font-medium">{{ p.supplier }}</td>
                            <td class="px-2 py-2 font-medium">{{ dateOf(p) }}</td>
                            <td class="px-2 py-2 font-medium">{{ getAddedBy(p) }}</td>
                            <td class="px-2 py-2 font-medium">
                                <button
                                    @click="openView(p)"
                                    type="button"
                                    class="px-2 py-2 text-white rounded-sm bg-red-600 cursor-pointer"
                                >
                                    <Eye class="w-4 h-4 shrink-0" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- pay modal -->
            <div v-if="showPayModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div class="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg bg-white p-5 space-y-4 shadow-sm">
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
                <div class="w-full max-w-3xl rounded-lg bg-white p-5 space-y-4 max-h-[90vh] overflow-y-auto">
                    <div class="flex items-center justify-between">
                        <h3 class="font-medium text-sm uppercase">Details for Trans-{{ String(details.id).padStart(4, '0') }}</h3>
                        <button @click="showViewModal = false"><X class="w-4 h-4" /></button>
                    </div>
                    <table class="w-full text-xs text-left">
                        <thead class="border-b border-gray-300">
                            <tr>
                                <th class="px-2 py-2 font-medium">#</th>
                                <th class="px-2 py-2 font-medium">Product</th>
                                <th class="px-2 py-2 font-medium">Unit</th>
                                <th class="px-2 py-2 font-medium">Quantity</th>
                                <th class="px-2 py-2 font-medium">Price</th>
                                <th class="px-2 py-2 font-medium">Batch</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            <tr v-for="(item, index) in details.items" :key="item.id">
                                <td class="px-2 py-2 font-medium">{{ index + 1 }}</td>
                                <td class="px-2 py-2 text-xs">
                                    <div>{{ item.name }}</div>
                                    <div class="text-green-600">{{ item.category }}</div>
                                </td>
                                <td class="px-2 py-2 text-xs">{{ item.unit_name ?? item.unit }}</td>
                                <td class="px-2 py-2 text-xs">{{ item.quantity }}</td>
                                <td class="px-2 py-2 text-xs">{{ money(item.buying_price) }}</td>
                                <td class="px-2 py-2 text-xs">
                                    <div>{{ item.batch_number || 'N/A' }}</div>
                                    <div class="text-green-600">{{ item.expiry_date || 'N/A' }}</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>
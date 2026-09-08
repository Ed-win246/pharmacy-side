<script setup>
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { ref, computed, onMounted } from 'vue';
import { Package, Wallet, AlertTriangle, Clock } from 'lucide-vue-next';

const medicines = ref([]);
const loading = ref(true);

onMounted(async () => {
    await fetchMedicines();
});

async function fetchMedicines() {
    loading.value = true;
    try {
        const { data } = await api.get('/medicines');
        medicines.value = data;
    } catch (error) {
        console.error('Failed to load metrics', error);
        toast.error('Failed to load metrics data');
    } finally {
        loading.value = false;
    }
}

const totalstockQuantity = computed(() => {
    return medicines.value.reduce((sum, item) => sum + (Number(item.stockQuantity) || 0), 0);
});

const totalInventoryValue = computed(() => {
    return medicines.value.reduce((sum, item) => {
        const quantity = Number(item.stockQuantity) || 0;
        const price = Number(item.unitPrice) || 0;
        return sum + (quantity * price);
    }, 0);
});

const lowstockQuantity = computed(() => {
    return medicines.value.filter(item => Number(item.stockQuantity) < 10).length;
});

const expiringSooncount = computed(() => {
    const today = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(today.getDate() + 60);

    return medicines.value.filter(item => {
        if (!item.expiryDate) return false;
        const expiry = new Date(item.expiryDate);
        return expiry >= today && expiry <= sixtyDaysFromNow;
    }).length;
});

const lowStockItems = computed(() => {
  return medicines.value
    .filter(item => Number(item.stockQuantity) < 10)
    .sort((a, b) => Number(a.stockQuantity) - Number(b.stockQuantity)); // most urgent first
});
</script>

<template>
    <div class="p-6 max-w-7xl mx-auto space-y-6">
        <div>
            <h1 class="font-bold text-2xl text-gray-800">Stock Monitoring</h1>
            <p class="text-gray-500 text-sm mt-1">Monitor live inventory and expiration status</p>
        </div>
        <div v-if="loading" class="text-center py-12 text-gray-400">
            Loading metrics...
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div class="bg-white border border-gray-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Inventory</span>
                    <div class="bg-green-100 p-2 rounded-lg">
                        <Package class="w-4 h-4 text-green-600" />
                    </div>
                </div>
                <p class="text-3xl font-bold text-gray-800 mt-4">{{ totalstockQuantity.toLocaleString() }}</p>
                <p class="text-xs mt-1 text-gray-400">Total units in stock</p>
            </div>
            <div class="bg-white border border-gray-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Inventory Value</span>
                    <div class="bg-blue-100 p-2 rounded-lg">
                        <Wallet class="w-4 h-4 text-blue-600" />
                    </div>
                </div>
                <p class="text-3xl font-bold text-gray-800 mt-4">
                    <span class="text-lg align-top">UGX</span> {{ totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }}
                </p>
                <p class="text-xs mt-1 text-gray-400">Total stock valuation</p>
            </div>
            <div class="bg-white border border-gray-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Low Stock</span>
                    <div class="bg-amber-100 p-2 rounded-lg">
                        <AlertTriangle class="w-4 h-4 text-amber-600" />
                    </div>
                </div>
                <div class="flex items-center gap-2 mt-4">
                    <p class="text-3xl font-bold text-amber-600">{{ lowstockQuantity }}</p>
                    <span class="px-2 py-0.5 text-xs font-semibold text-amber-700 bg-amber-50 rounded-full border border-amber-200 whitespace-nowrap">
                        &lt; 10 units
                    </span>
                </div>
                <p class="text-xs mt-1 text-gray-400">Items requiring urgent restock</p>
            </div>
            <div class="bg-white border border-gray-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Expiring Soon</span>
                    <div class="bg-red-100 p-2 rounded-lg">
                        <Clock class="w-4 h-4 text-red-600" />
                    </div>
                </div>
                <div class="flex items-center gap-2 mt-4">
                    <p class="text-3xl font-bold text-red-600">{{ expiringSooncount }}</p>
                    <span class="px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-50 rounded-full border border-red-200 whitespace-nowrap">
                        &lt; 60 days
                    </span>
                </div>
                <p class="text-xs mt-1 text-gray-400">Medicines nearing expiration</p>
            </div>

        </div>
        <div class="bg-white rounded-lg shadow-sm overflow-hidden border-gray-200 border">
            <div class="px-5 py-2 justify-between flex items-center ">
                <h2 class="font-bold text-xs">Low Stock Medicines </h2>
                <span class="text-xs font-bold">{{ lowStockItems.length }} items</span>
            </div>
            <table class="w-full text-sm text-left">
                <thead class="bg-gray-50 text-gray-500">
                    <tr>
                        <th class="px-5 py-2">Medicine</th>
                        <th class="px-5 py-2">Category</th>
                        <th class="px-5 py-2">Stock Left</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <tr v-for="item in lowStockItems" :key="item.id" class="hover:bg-gray-50">
                        <td class="px-5 py-3 font-medium text-gray-800">{{ item.name }}</td>
                        <td class="px-5 py-3 text-gray-500">{{ item.category }}</td>
                        <td class="px-5 py-3">
                            <span class="text-red-600 font-semibold">{{ item.stockQuantity }}</span>
                        </td>
                    </tr>

                    <tr v-if="lowStockItems.length === 0">
                        <td colspan="3" class="text-center py-8 text-gray-400">
                            All items are well stocked — nothing to worry about.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>
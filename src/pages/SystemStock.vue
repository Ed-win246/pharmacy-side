<script setup>
import { ref, onMounted } from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { CircleCheck, X} from 'lucide-vue-next';

const systemStock = ref([]);
const loading = ref(false);
const saving = ref(false);

const showConfirmModal = ref(false);
const selectedItem = ref(null);
const actualQuantities = ref({});   // { [stockItemId]: typedNumber }

onMounted(fetchSystemStock);

async function fetchSystemStock() {
    loading.value = true;
    try {
        const { data } = await api.get('/system-stock');
        systemStock.value = data;
    } catch (error) {
        console.error('Failed to load system stock', error);
        toast.error('Failed to load system stock');
    } finally {
        loading.value = false;
    }
}

// Runs when Save is clicked: checks the input, then opens the modal
function promptUpdate(group, unit) {
    const entered = actualQuantities.value[unit.id];

    if (entered === undefined || entered === null || entered === '') {
        toast.error('Enter the actual quantity first');
        return;
    }
    if (!Number.isInteger(Number(entered)) || Number(entered) < 0) {
        toast.error('Actual quantity must be a whole number, 0 or more');
        return;
    }
    if (Number(entered) === Number(unit.system_qty)) {
        toast.error('Actual quantity matches the system quantity. Nothing to update.');
        return;
    }

    selectedItem.value = {
        id: unit.id,                        // the stock_items id
        medicine_name: group.medicine_name,
        unit_name: unit.unit_name,
        system_qty: unit.system_qty,
        actual_quantity: Number(entered),
    };
    showConfirmModal.value = true;
}

// Runs when Yes is clicked in the modal: sends it to the backend
async function confirmStockUpdate() {
    if (!selectedItem.value) return;
    saving.value = true;

    try {
        const itemId = selectedItem.value.id;

        await api.post(`/system-stock/${itemId}/reconcile`, {
            actual_quantity: selectedItem.value.actual_quantity,
        });

        toast.success(`${selectedItem.value.medicine_name} updated to ${selectedItem.value.actual_quantity} ${selectedItem.value.unit_name ?? ''}`);

        delete actualQuantities.value[itemId];
        showConfirmModal.value = false;
        selectedItem.value = null;

        await fetchSystemStock();
    } catch (error) {
        console.error('Failed to update system stock', error);
        toast.error(error.response?.data?.message || 'Failed to update system stock');
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <div class="min-h-screen w-full">
        <div class="h-full flex flex-col pb-10 p-2">
            <div class="flex items-center justify-between p-4">
                <h2 class="font-medium text-sm flex items-center uppercase gap-2">System Stock Levels</h2>
                <div class="font-medium text-sm">
                    <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                    <span class="text-gray-400"> / System Stock Levels</span>
                </div>
            </div>

            <div class="mt-2 bg-white rounded-sm shadow-sm overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="tracking-wide text-black border-b border-gray-200">
                        <tr>
                            <td class="px-4 py-3 font-medium">#</td>
                            <td class="px-4 py-3 font-medium">Product</td>
                            <td class="px-4 py-3 font-medium flex items-center justify-center" colspan="2">Batches</td>
                        </tr>
                    </thead>

                    <tbody class="text-gray-700">
                        <tr v-if="loading">
                            <td class="px-4 py-12 text-center text-xs text-gray-400" colspan="6">
                                Loading system stock...
                            </td>
                        </tr>
                        <tr v-else-if="systemStock.length === 0">
                            <td class="px-4 py-12 text-center text-xs text-gray-400" colspan="6">
                                No system stock inserted yet!
                            </td>
                        </tr>

                        <template v-for="(group, groupIndex) in systemStock" :key="group.key">
                            <!-- header row: number, product name, and the four column labels -->
                            <tr>
                                <td :rowspan="group.units.length + 1" class="px-4 py-3 font-semibold text-center align-top">
                                    {{ groupIndex + 1 }}
                                </td>
                                <td :rowspan="group.units.length + 1" class="px-4 py-3 align-top">
                                    <div class="font-bold text-gray-900 text-sm">{{ group.medicine_name }}</div>
                                    <div class="text-green-600 font-medium text-xs">{{ group.category }}</div>
                                </td>
                                <td class="px-2 py-2"><div class="header-batch">Batch</div></td>
                                <td class="px-2 py-2"><div class="header-system-quantity">System Quantity</div></td>
                                <td class="px-2 py-2 w-56"><div class="header-actual-quantity">Actual Quantity</div></td>
                                <td class="px-2 py-2"><div class="header-actions">Actions</div></td>
                            </tr>

                            <!-- one row per unit (Box, Tablet, ...) -->
                            <tr v-for="(unit, unitIndex) in group.units" :key="unit.id" class="hover:bg-slate-50">
                                <!-- batches are listed once, spanning all unit rows of this product -->
                                <td v-if="unitIndex === 0"
                                    :rowspan="group.units.length"
                                    class="px-4 py-2 text-xs font-medium text-gray-700 text-center align-top">
                                    <div v-if="group.batches.length === 0">-</div>
                                    <div v-for="b in group.batches" :key="b.id">{{ b.batch_number }}</div>
                                </td>

                                <td class="px-4 py-2 text-xs font-medium text-gray-700 text-center">
                                    {{ unit.system_qty }} {{ unit.unit_name }}
                                </td>

                                <td class="px-4 py-2.5 text-center">
                                    <input type="number"
                                        v-model.number="actualQuantities[unit.id]"
                                        placeholder="Enter actual quantity"
                                        min="0"
                                        class="w-56 border border-gray-300 rounded-sm px-2 py-1 text-xs text-center focus:ring-1 focus:ring-green-500 outline-none"/>
                                </td>

                                <td class="px-4 py-2.5 text-center">
                                    <button @click="promptUpdate(group, unit)"
                                        class="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-sm font-medium transition cursor-pointer">
                                        Save
                                    </button>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <!-- confirmation modal -->
            <div v-if="showConfirmModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-sm max-w-2xl w-full p-6 space-y-4 shadow-lg">
                    <div class="flex items-center justify-between border-b border-gray-200">
                        <h3 class="text-xl font-semibold text-gray-900 pb-2">
                            Update Quantity
                        </h3>
                        <button @click="showConfirmModal=false">
                            <X class="w-4 h-4 shrink-0 cursor-pointer"/>
                        </button>
                        
                    </div>
                    <p class="text-sm text-gray-600 leading-relaxed">
                        Are you sure you want to update quantity of
                        <span class="font-semibold text-gray-900">{{ selectedItem?.medicine_name }}</span>
                        from
                        <span class="font-semibold  text-gray-900">{{ selectedItem?.system_qty }} {{ selectedItem?.unit_name }}</span>
                        to
                        <span class="font-semibold  text-gray-900">{{ selectedItem?.actual_quantity }} {{ selectedItem?.unit_name }}</span>?
                    </p>
                    <div class="flex justify-end gap-3 pt-2">
                        <button @click="showConfirmModal = false"
                            class="text-xs text-white font-medium border border-gray-300 rounded-sm cursor-pointer text-gray-700 px-4 py-2 bg-gray-600">
                            Cancel
                        </button>
                        <button @click="confirmStockUpdate"
                            :disabled="saving"
                            class="px-4 py-2 text-xs font-medium bg-green-600 text-white rounded-sm hover:bg-green-700 disabled:opacity-50 cursor-pointer flex items-center gap-2">
                            <CircleCheck class="w-4 h-4 shrink-0"/>
                            {{ saving ? 'Updating...' : 'Yes' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.header-batch,
.header-system-quantity,
.header-actual-quantity,
.header-actions {
  border: 1px solid #000;
  border-radius: 8px;
  background-color: #000;
  color: #fff;
  text-align: center;
  font-size: 0.75rem;
}
</style>
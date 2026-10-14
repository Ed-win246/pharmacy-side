<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { CircleCheck, X} from 'lucide-vue-next';

const systemStock = ref([]);
// const groupedSystemStock = computed(() => {
//     const groups = new Map();

//     systemStock.value.forEach((row) => {
//         const medicineName = String(
//             row.medicine_name ?? row.name ?? row.medicine ?? ''
//         ).trim() || 'Unknown';
//         const key = String(
//             row.medicine_id ?? row.product_id ?? medicineName.toLowerCase()
//         );

//         if (!groups.has(key)) {
//             groups.set(key, {
//                 key,
//                 medicine_name: medicineName,
//                 category: row.category,
//                 units: [],
//             });
//         }

//         const group = groups.get(key);
//         group.units.push({
//             ...row,
//             system_qty: row.system_qty ?? row.quantity,
//         });
//     });

//     return [...groups.values()]
//         .sort((a, b) => a.medicine_name.localeCompare(b.medicine_name));
// });
const groupedSystemStock = computed(() => {
    const groups = new Map();

    systemStock.value.forEach((row) => {
        const medicineName = String(
            row.medicine_name ?? row.name ?? ''
        ).trim() || 'Unknown';
        const key = medicineName.toLowerCase();

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                medicine_name: medicineName,
                category: row.category,
                batches: [],
            });
        }

        const group = groups.get(key);
        group.batches.push({
            id: row.id,
            batch_number: row.batch_number || '—',
            system_qty: row.system_qty,
            unit_name: row.unit_name,
            expiry_date: row.expiry_date,
        });
    });

    return [...groups.values()]
        .sort((a, b) => a.medicine_name.localeCompare(b.medicine_name));
});

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
// function promptUpdate(group, unit) {
//     const entered = actualQuantities.value[unit.id];

//     if (entered === undefined || entered === null || entered === '') {
//         toast.error('Enter the actual quantity first');
//         return;
//     }
//     if (!Number.isInteger(Number(entered)) || Number(entered) < 0) {
//         toast.error('Actual quantity must be a whole number, 0 or more');
//         return;
//     }
//     if (Number(entered) === Number(unit.system_qty)) {
//         toast.error('Actual quantity matches the system quantity. Nothing to update.');
//         return;
//     }

//     selectedItem.value = {
//         id: unit.id,                        // the stock_items id
//         medicine_name: group.medicine_name,
//         unit_name: unit.unit_name,
//         system_qty: unit.system_qty,
//         actual_quantity: Number(entered),
//     };
//     showConfirmModal.value = true;
// }
function promptUpdate(group, batch) {
    const entered = actualQuantities.value[batch.id];

    if (entered === undefined || entered === null || entered === '') {
        toast.error('Enter the actual quantity first');
        return;
    }
    if (!Number.isInteger(Number(entered)) || Number(entered) < 0) {
        toast.error('Actual quantity must be a whole number, 0 or more');
        return;
    }
    if (Number(entered) === Number(batch.system_qty)) {
        toast.error('Actual quantity matches the system quantity. Nothing to update.');
        return;
    }

    selectedItem.value = {
        id: batch.id, // the stock_levels batch ID
        medicine_name: group.medicine_name,
        batch_number: batch.batch_number,
        unit_name: batch.unit_name,
        system_qty: batch.system_qty,
        actual_quantity: Number(entered),
    };
    showConfirmModal.value = true;
}
// Runs when Yes is clicked in the modal: sends it to the backend
// async function confirmStockUpdate() {
//     if (!selectedItem.value) return;
//     saving.value = true;

//     try {
//         const itemId = selectedItem.value.id;

//         await api.post(`/system-stock/${itemId}/reconcile`, {
//             actual_quantity: selectedItem.value.actual_quantity,
//         });

//         toast.success(`${selectedItem.value.medicine_name} updated to ${selectedItem.value.actual_quantity} ${selectedItem.value.unit_name ?? ''}`);

//         delete actualQuantities.value[itemId];
//         showConfirmModal.value = false;
//         selectedItem.value = null;

//         await fetchSystemStock();
//     } catch (error) {
//         console.error('Failed to update system stock', error);
//         toast.error(error.response?.data?.message || 'Failed to update system stock');
//     } finally {
//         saving.value = false;
//     }
// }
async function confirmStockUpdate() {
    if (!selectedItem.value) return;
    saving.value = true;

    try {
        const itemId = selectedItem.value.id;

        const response = await api.post(`/system-stock/${itemId}/reconcile`, {
            actual_quantity: selectedItem.value.actual_quantity,
        });

        toast.success(`${selectedItem.value.medicine_name} updated successfully`);

        // Clear the input model for this specific unit ID
        delete actualQuantities.value[itemId];
        
        showConfirmModal.value = false;
        selectedItem.value = null;

        // Fetch fresh stock data from backend
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
                            <td class="px-4 py-3 font-medium flex items-center justify-center" colspan="4">Batches</td>
                        </tr>
                    </thead>

                    <tbody class="text-gray-700">
                        <tr v-if="loading">
                            <td class="px-4 py-12 text-center text-xs text-gray-400" colspan="6">
                                Loading system stock...
                            </td>
                        </tr>
                        <tr v-else-if="groupedSystemStock.length === 0">
                            <td class="px-4 py-12 text-center text-xs text-gray-400" colspan="6">
                                No system stock inserted yet!
                            </td>
                        </tr>


                        <template v-for="(group, groupIndex) in groupedSystemStock" :key="group.key">
                            <!-- Header row: Product details on left, sub-column titles on right -->
                            <tr>
                                <td :rowspan="(group.batches?.length || 1) + 1" class="px-4 py-3 font-semibold text-center align-center">
                                    {{ groupIndex + 1 }}
                                </td>
                                <td :rowspan="(group.batches?.length || 1) + 1" class="px-4 py-3 align-center">
                                    <div class="font-bold text-gray-900 text-sm">{{ group.medicine_name }}</div>
                                    <div class="text-green-600 font-medium text-xs">{{ group.category }}</div>
                                </td>
                                <td class="px-2 py-2"><div class="header-batch">Batch</div></td>
                                <td class="px-2 py-2"><div class="header-system-quantity">System Quantity</div></td>
                                <td class="px-2 py-2 w-56"><div class="header-actual-quantity">Actual Quantity</div></td>
                                <td class="px-2 py-2"><div class="header-actions">Actions</div></td>
                            </tr>

                            <!-- Empty state if no batches exist for this product -->
                            <tr v-if="!group.batches?.length">
                                <td class="px-4 py-2 text-center text-xs text-gray-400" colspan="4">
                                    No batches available for this product.
                                </td>
                            </tr>

                            <!-- Individual Batch Rows -->
                            <tr v-for="batch in (group.batches || [])" :key="batch.id" class="hover:bg-slate-50 border-b border-gray-100">
                                <!-- 1. Individual Batch Number -->
                                <td class="px-4 py-2 text-xs font-semibold text-gray-800 text-center align-middle">
                                    {{ batch.batch_number }}
                                </td>

                                <!-- 2. System Quantity for this batch -->
                                <td class="px-4 py-2 text-xs font-medium text-gray-700 text-center align-middle">
                                    {{ batch.system_qty }} {{ batch.unit_name }}
                                </td>

                                <!-- 3. Actual Quantity Input Field -->
                                <td class="px-4 py-2.5 text-center align-middle">
                                    <input 
                                        type="number"
                                        v-model.number="actualQuantities[batch.id]"
                                        placeholder="Enter actual quantity"
                                        min="0"
                                        class="w-56 border border-gray-300 rounded-sm px-2 py-1 text-xs text-center focus:ring-1 focus:ring-green-500 outline-none"
                                    />
                                </td>

                                <!-- 4. Save Button -->
                                <td class="px-4 py-2.5 text-center align-middle">
                                    <button 
                                        @click="promptUpdate(group, batch)"
                                        class="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-sm font-medium transition cursor-pointer"
                                    >
                                        Save
                                    </button>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>

            <!-- confirmation modal -->
            <div v-if="showConfirmModal" class="fixed inset-0 bg-black/50 backdrop-md flex items-center justify-center z-50 p-4">
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
                          (Batch: <span class="font-semibold text-gray-900">{{ selectedItem?.batch_number }}</span>)
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
  font-size: 12px;
}
</style>
<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { SquarePen, X, Trash2, CircleCheck, LoaderCircle, Plus } from 'lucide-vue-next';

// ====================================================================
// STATE
// ====================================================================
const stockLevels = ref([]);      // flat list of batches, exactly as /stock-levels returns it
const loading = ref(false);
const saving = ref(false);        // "Update Stock" request running
const addingStock = ref(false);   // "Add Stock" request running

// Registered products and units (they decide which units the Add Stock dropdown offers)
const medicines = ref([]);
const units = ref([]);
const catalogLoading = ref(false);
const catalogFailed = ref(false);

const formatMoney = (value) => Number(value || 0).toLocaleString();
const hasValue = (v) => v !== undefined && v !== null && v !== '';

onMounted(() => {
    fetchStockLevels();
    fetchCatalog();
});

// quiet = true reloads the data without showing "Loading products...."
async function fetchStockLevels(quiet = false) {
    if (quiet !== true) loading.value = true;

    try {
        const { data } = await api.get('/stock-levels');
        stockLevels.value = data;
    } catch (error) {
        console.error('Failed to fetch batch levels', error);
        toast.error('Failed to fetch stock levels');
    } finally {
        loading.value = false;
    }
}

// Registered products + units (same data the Add Stock page uses)
async function fetchCatalog() {
    catalogLoading.value = true;
    catalogFailed.value = false;

    try {
        const [medicineRes, unitRes] = await Promise.all([api.get('/medicines'), api.get('/units')]);
        medicines.value = medicineRes.data;
        units.value = unitRes.data;
    } catch (error) {
        catalogFailed.value = true;
        console.error('Failed to load registered units', error);
        toast.error('Failed to load registered units');
    } finally {
        catalogLoading.value = false;
    }
}

// ====================================================================
// GROUPING: one entry per product, holding all of its batches
// ====================================================================
// Earliest expiry first
const byExpiry = (a, b) =>
    String(a.expiry_date ?? '9999').localeCompare(String(b.expiry_date ?? '9999'));

// The key is the lowercase, trimmed name, so "Para" and "para " are one product
const products = computed(() => {
    const groups = {};

    stockLevels.value.forEach((level) => {
        const name = String(level.medicine_name ?? '').trim() || 'unknown';
        const key = name.toLowerCase();

        if (!groups[key]) {
            groups[key] = { key, name, category: level.category, batches: [] };
        }
        if (!groups[key].category && level.category) {
            groups[key].category = level.category;
        }
        // the same objects as in stockLevels, so changing a batch changes the stock level itself
        groups[key].batches.push(level);
    });

    Object.values(groups).forEach((g) => g.batches.sort(byExpiry));
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
});

// Rows of the main table
const productRows = computed(() =>
    products.value.map((p) => ({
        key: p.key,
        name: p.name,
        category: p.category,
        units: [...new Set(p.batches.map((b) => b.unit_name).filter(Boolean))],
        added_by: p.batches.find((b) => b.added_by)?.added_by ?? '-',
        batches_count: p.batches.length,
        total_price: p.batches.reduce((sum, b) => sum + Number(b.buying_price || 0), 0),
    }))
);

// ====================================================================
// DATE HELPERS
// ====================================================================
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

// YYYY-MM-DD text sorts exactly like real dates, so a text comparison is enough.
// Expiring today still counts as not yet expired (same rule as Batch Levels).
const isExpired = (value) => !!value && dateOnly(value) < todayString();

// Same colours as Batch Levels: red = expired, light orange = not yet expired
// (not used by the template yet)
const expiryStyle = (value) => {
    if (!value) return { color: '#9ca3af' };
    return isExpired(value)
        ? { backgroundColor: '#fee2e2', color: '#dc2626' }
        : { backgroundColor: '#ffedd5', color: '#f97316' };
};

const inputClass = 'rounded-sm border-2 border-gray-300 bg-white px-2 py-1 text-xs outline-none';

// ====================================================================
// MODAL STATE
// ====================================================================
const tabs = [
    { key: 'update', label: 'Update' },
    { key: 'addstock', label: 'Add stock' },
];

const showModal = ref(false);
const activeTab = ref('update');
const selected = ref(null);          // { key, name, category }, captured when the modal opens
const actualStock = ref({});         // { [batchId]: typed number }
const expiryDates = ref({});         // { [batchId]: edited expiry date }
const savingExpiryId = ref(null);
const newBatches = ref([]);          // rows of the Add stock tab
const batchToDelete = ref(null);
const activatingId = ref(null);
let tempId = -1;                     // temporary ids for rows that only exist in the browser

// The live batches of the selected product
const selectedBatches = computed(
    () => products.value.find((p) => p.key === selected.value?.key)?.batches ?? []
);

// ====================================================================
// REGISTERED UNITS FOR THE SELECTED PRODUCT
// ====================================================================
// The smallest unit of a medicine (a few field names are tried, as on the Add Stock page)
const getUnitName = (med) => med?.unit_name || med?.unit?.unit_name || med?.unit?.name || '';

// Smallest unit plus every registered pack unit (Box, Pack, ...)
function unitsOfMedicine(med) {
    const names = [getUnitName(med)];

    (med.unit_details || []).forEach((row) => {
        const unit = units.value.find((u) => Number(u.id) === Number(row.unit_id));
        if (unit) names.push(unit.unit_name);
    });

    return names.filter(Boolean);
}

// The registered product with the same (lowercase, trimmed) name as the one in the modal
const selectedMedicine = computed(
    () =>
        medicines.value.find(
            (m) => String(m.name ?? '').trim().toLowerCase() === selected.value?.key
        ) ?? null
);

// ONLY registered units are offered
const unitOptions = computed(() =>
    selectedMedicine.value ? [...new Set(unitsOfMedicine(selectedMedicine.value))] : []
);

// Explains why the unit dropdown is not available ('' when everything is fine)
const unitProblem = computed(() => {
    if (catalogLoading.value) return 'Loading registered units...';
    if (catalogFailed.value) return 'Could not load the registered units.';
    if (!selectedMedicine.value) return 'This product was not found in your registered products, so it has no registered units.';
    if (unitOptions.value.length === 0) return 'No unit is registered for this product.';
    return '';
});

// ====================================================================
// OPEN / CLOSE THE RECONCILE MODAL
// ====================================================================
function blankRow() {
    return {
        tempId: tempId--,
        batch_number: '',
        quantity: '',
        // a product with a single registered unit gets it preselected
        unit_name: unitOptions.value.length === 1 ? unitOptions.value[0] : '',
        buying_price: '',
        expiry_date: '',
    };
}

function openReconcileModal(key) {
    const product = products.value.find((p) => p.key === key);
    if (!product) return;

    selected.value = { key: product.key, name: product.name, category: product.category };
    activeTab.value = 'update';
    actualStock.value = {};
    expiryDates.value = Object.fromEntries(
        product.batches.map((batch) => [batch.id, dateOnly(batch.expiry_date)])
    );
    newBatches.value = [];            // the Add stock tab starts empty
    batchToDelete.value = null;
    showModal.value = true;
}

function closeModal() {
    showModal.value = false;
    selected.value = null;
}

// (not used by the template yet)
async function saveExpiryDate(batch) {
    savingExpiryId.value = batch.id;

    try {
        const expiryDate = expiryDates.value[batch.id] || null;
        await api.put(`/stock-levels/${batch.id}`, { expiry_date: expiryDate });
        stockLevels.value = stockLevels.value.map((level) =>
            level.id === batch.id ? { ...level, expiry_date: expiryDate } : level
        );
        toast.success('Expiry date updated successfully');
    } catch (error) {
        console.error('Failed to update expiry date', error);
        toast.error('Failed to update expiry date');
    } finally {
        savingExpiryId.value = null;
    }
}

// ====================================================================
// DELETE A BATCH
// ====================================================================
const showDeleteModal = ref(false);
const deleting = ref(false);

function deleteModal(batch) {
    batchToDelete.value = batch;
    showDeleteModal.value = true;
}

function closeDeleteModal() {
    showDeleteModal.value = false;
    batchToDelete.value = null;
}

async function deleteBatch() {
    if (!batchToDelete.value || deleting.value) return;

    deleting.value = true;

    try {
        const id = batchToDelete.value.id;
        await api.delete(`/stock-levels/${id}`);
        stockLevels.value = stockLevels.value.filter((level) => level.id !== id);
        delete actualStock.value[id];
        delete expiryDates.value[id];
        toast.success('Product batch deleted successfully');
        closeDeleteModal();
    } catch (error) {
        console.error('Failed to delete this batch', error);
        toast.error(error.response?.data?.message || 'Failed to delete this particular batch');
    } finally {
        deleting.value = false;
    }
}

// ====================================================================
// ACTIVATE A BATCH
// ====================================================================
async function activateBatch(batch) {
    if (batch.is_active || activatingId.value === batch.id) return;

    if (isExpired(batch.expiry_date)) {
        toast.error('Cannot activate this batch because it has expired');
        return;
    }

    activatingId.value = batch.id;
    try {
        await api.post(`/stock-levels/${batch.id}/activate`);
        batch.is_active = true;
        toast.success(`Batch ${batch.batch_number || '—'} activated`);
    } catch (error) {
        console.error('Failed to activate batch', error);
        toast.error(error.response?.data?.message || 'Failed to activate batch');
    } finally {
        activatingId.value = null;
    }
}

// ====================================================================
// UPDATE TAB: save the actual stock
// ====================================================================
// Batches where an actual stock was typed and differs from the current stock
const pendingChanges = computed(() =>
    selectedBatches.value.filter((b) => {
        const typed = actualStock.value[b.id];
        return hasValue(typed) && Number(typed) !== Number(b.quantity);
    })
);

async function saveChanges() {
    if (pendingChanges.value.length === 0) {
        toast.error('Enter actual stock that differs from current stock');
        return;
    }

    for (const b of pendingChanges.value) {
        const typed = Number(actualStock.value[b.id]);
        if (!Number.isInteger(typed) || typed < 0) {
            toast.error(`Actual stock for batch ${b.batch_number || '—'} must be a whole number, 0 or more`);
            return;
        }
    }

    saving.value = true;
    const changed = [...pendingChanges.value];

    try {
        // Wait for every batch update before refreshing the displayed stock
        const results = await Promise.allSettled(
            changed.map((batch) =>
                api.put(`/stock-levels/${batch.id}`, {
                    quantity: Number(actualStock.value[batch.id]),
                })
            )
        );

        let successfulUpdates = 0;
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successfulUpdates += 1;
                delete actualStock.value[changed[index].id];
            } else {
                console.error('Failed to update stock', changed[index], result.reason);
            }
        });

        await fetchStockLevels(true);

        if (successfulUpdates === changed.length) {
            toast.success(`${successfulUpdates} batch${successfulUpdates === 1 ? '' : 'es'} updated`);
            closeModal();
        } else {
            const serverMessage = results.find((r) => r.status === 'rejected')?.reason?.response?.data?.message;
            toast.error(serverMessage || `${changed.length - successfulUpdates} stock update(s) failed`);
        }
    } finally {
        saving.value = false;
    }
}

// ====================================================================
// ADD STOCK TAB
// ====================================================================
function addRow() {
    newBatches.value.push(blankRow());
}

function removeRow(index) {
    newBatches.value.splice(index, 1);
}

// Returns the first problem as a message, or '' when every row is valid
function validateNewRows() {
    const taken = new Set(
        selectedBatches.value.map((b) => String(b.batch_number ?? '').trim().toLowerCase())
    );

    for (let i = 0; i < newBatches.value.length; i++) {
        const row = newBatches.value[i];
        const label = `Row ${i + 1}`;
        const batchNumber = String(row.batch_number).trim();
        const quantity = Number(row.quantity);
        const price = Number(row.buying_price);

        if (!batchNumber) return `${label}: enter a batch number`;
        if (taken.has(batchNumber.toLowerCase())) return `${label}: batch ${batchNumber} already exists for this product`;
        if (!hasValue(row.quantity) || !Number.isInteger(quantity) || quantity < 1) return `${label}: stock must be a whole number of 1 or more`;
        if (!unitOptions.value.includes(row.unit_name)) return `${label}: choose a registered unit`;
        if (!row.expiry_date || row.expiry_date < tomorrowString()) return `${label}: expiry date must be after today`;
        if (!hasValue(row.buying_price) || !Number.isFinite(price) || price < 0) return `${label}: enter a buying price of 0 or more`;

        taken.add(batchNumber.toLowerCase());   // also catches duplicates between the new rows
    }
    return '';
}

async function saveNewStock() {
    if (!selected.value || addingStock.value) return;

    if (newBatches.value.length === 0) {
        toast.error('Add at least one batch first');
        return;
    }

    const problem = validateNewRows();
    if (problem) {
        toast.error(problem);
        return;
    }

    addingStock.value = true;
    try {
        const { data } = await api.post('/stock-levels/batches', {
            medicine_name: selected.value.name,
            category: selected.value.category ?? null,
            batches: newBatches.value.map((row) => ({
                batch_number: String(row.batch_number).trim(),
                unit_name: row.unit_name,
                quantity: Number(row.quantity),
                buying_price: Number(row.buying_price),
                expiry_date: row.expiry_date,
            })),
        });

        newBatches.value = [];
        closeModal();
        toast.success(data?.message || 'New stcok has been reconciled..');
        await fetchStockLevels(true);   // refresh the landing list with the newly added stock
    } catch (error) {
        console.error('Failed to add stock', error);
        toast.error(error.response?.data?.message || 'Failed to add stock');
    } finally {
        addingStock.value = false;
    }
}
</script>

<template>
    <div class="min-h-screen w-full">
        <div class="h-full flex flex-col pb-10 p-2">
            <div class="flex items-center justify-between p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">Reconcile Stock</h2>
                </div>
                <div class="font-medium text-sm">
                    <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                    <span class="text-gray-400"> / Reconcile Stock</span>
                </div>
            </div>

            <!-- ============ MAIN TABLE ============ -->
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
                            <td class="px-4 py-12 text-center" colspan="7">Loading products....</td>
                        </tr>
                        <tr v-else-if="productRows.length === 0">
                            <td class="px-4 py-12 text-center" colspan="7">No data found to reconcile...</td>
                        </tr>

                        <tr v-for="(row, index) in productRows" :key="row.key" class="text-xs">
                            <td class="px-4 py-3 font-medium">{{ index + 1 }}</td>
                            <td class="px-4 py-3 font-medium">{{ row.name }}</td>
                            <td class="px-4 py-3 font-medium">{{ row.category }}</td>
                            <td class="px-4 py-3 font-medium">{{ row.batches_count }}</td>
                            <td class="px-4 py-3 font-medium">{{ formatMoney(row.total_price) }}</td>
                            <td class="px-4 py-3 font-medium">{{ row.added_by }}</td>
                            <td class="px-4 py-3">
                                <button @click="openReconcileModal(row.key)"
                                    type="button"
                                    class="rounded-sm bg-[#0b0b45] p-2 text-white cursor-pointer"
                                    :aria-label="`Reconcile ${row.name}`">
                                    <SquarePen class="w-3 h-3 shrink-0" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- ============ RECONCILE MODAL ============ -->
            <div v-if="showModal && selected"
                class="fixed inset-0 backdrop-md bg-black/50 z-50 flex items-center justify-center p-4">
                <div class="no-scrollbar bg-white max-w-5xl w-full max-h-[80vh] overflow-y-auto shadow-sm p-5 space-y-4 rounded-sm">
                    <div class="flex items-center justify-between border-b border-gray-200 pb-3">
                        <h3 class="text-sm font-semibold tracking-wider text-gray-700">
                            Reconcile Quantities for: {{ selected.name }}
                        </h3>
                        <button @click="closeModal" type="button" aria-label="Close" class="text-gray-400 cursor-pointer">
                            <X class="w-4 h-4" />
                        </button>
                    </div>

                    <!-- tabs -->
                    <div class="flex w-full">
                        <button v-for="tab in tabs" :key="tab.key"
                            type="button"
                            @click="activeTab = tab.key"
                            class="flex-1 border-b-2 py-3 text-center text-sm font-medium tracking-wide cursor-pointer"
                            :class="activeTab === tab.key
                                ? 'border-green-500 text-gray-700 text-xl'
                                : 'border-transparent text-gray-400'">
                            {{ tab.label }}
                        </button>
                    </div>

                    <!-- body -->
                    <div class="p-5">
                        <!-- ---------- UPDATE TAB ---------- -->
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
                                    <td class="px-4 py-12 text-center" colspan="6">
                                        No batches for this product. Use the Add stock tab to add one.
                                    </td>
                                </tr>

                                <tr v-for="batch in selectedBatches" :key="batch.id">
                                    <td class="px-3 py-2 font-medium">
                                        <div class="border-2 border-gray-400 rounded-sm flex items-center gap-2 px-2 py-1 bg-gray-100 text-gray-500">
                                            {{ batch.batch_number }}
                                        </div>
                                    </td>
                                    <td class="px-3 py-2 font-medium">
                                        <div class="flex items-center gap-2 rounded-sm border-2 border-gray-400 bg-gray-100 px-2 py-1 text-gray-500">
                                            {{ batch.quantity }}
                                            <span class="text-xs">{{ batch.unit_name }}</span>
                                        </div>
                                    </td>
                                    <td class="px-3 py-2">
                                        <div class="flex items-center gap-2">
                                            <input type="number" min="0"
                                                v-model.number="actualStock[batch.id]"
                                                :placeholder="String(batch.quantity)"
                                                :class="[inputClass, 'w-36 text-center']" />
                                            <span class="text-xs">{{ batch.unit_name }}</span>
                                        </div>
                                    </td>
                                    <td class="px-3 py-2">
                                        <div class="flex items-center gap-2">
                                            <input v-model="expiryDates[batch.id]"
                                                type="date"
                                                :class="[inputClass, 'w-40']"
                                                :aria-label="`Expiry date for batch ${batch.batch_number}`" />
                                        </div>
                                    </td>
                                    <td class="px-3 py-2">
                                        <div class="flex items-center gap-2">
                                            <input type="number" min="0"
                                                v-model.number="batch.buying_price"
                                                :class="[inputClass, 'w-36']" />
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

                        <!-- ---------- ADD STOCK TAB ---------- -->
                        <div v-else>
                            <p v-if="unitProblem" class="py-12 text-center text-sm text-red-500">
                                {{ unitProblem }}
                                <button v-if="catalogFailed" @click="fetchCatalog" type="button"
                                    class="ml-2 cursor-pointer underline">Retry</button>
                            </p>

                            <template v-else>
                                <table v-if="newBatches.length > 0" class="w-full text-left text-sm">
                                    <thead class="border-b border-gray-200 tracking-wide text-gray-600">
                                        <tr>
                                            <th class="px-3 py-2 font-medium">Batch</th>
                                            <th class="px-3 py-2 font-medium">Current Stock</th>
                                            <th class="px-3 py-2 font-medium">Unit</th>
                                            <th class="px-3 py-2 font-medium">Expiry Date</th>
                                            <th class="px-3 py-2 font-medium">Total Buy Price</th>
                                            <th class="px-3 py-2 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="text-gray-500">
                                        <tr v-for="(row, index) in newBatches" :key="row.tempId">
                                            <td class="px-3 py-2">
                                                <input type="text" v-model="row.batch_number" placeholder="Batch" :class="inputClass" />
                                            </td>
                                            <td class="px-3 py-2">
                                                <input type="number" min="1" v-model.number="row.quantity" placeholder="Quantity" :class="inputClass" />
                                            </td>
                                            <td class="px-3 py-2">
                                                <select v-model="row.unit_name" :class="[inputClass, 'w-28']">
                                                    <option value="" disabled>Unit</option>
                                                    <option v-for="u in unitOptions" :key="u" :value="u">{{ u }}</option>
                                                </select>
                                            </td>
                                            <td class="px-3 py-2">
                                                <input type="date" v-model="row.expiry_date" :min="tomorrowString()" :class="inputClass" />
                                            </td>
                                            <td class="px-3 py-2">
                                                <input type="number" min="0" step="any" v-model.number="row.buying_price" placeholder="Buy price" :class="inputClass" />
                                            </td>
                                            <td class="px-3 py-2">
                                                <button @click="removeRow(index)" type="button"
                                                    aria-label="Remove this row"
                                                    class="inline-flex cursor-pointer items-center gap-1.5 rounded-sm bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700">
                                                    <Trash2 class="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <p v-else class="py-12 text-center text-sm text-gray-400">
                                    No batches added yet. Click "Add batch" to start.
                                </p>

                                <button @click="addRow" type="button"
                                    class="mx-auto mt-4 flex items-center justify-center cursor-pointer gap-1.5 rounded-sm border bg-red-700 px-3 py-1.5 text-xs font-medium text-white">
                                    <Plus class="h-3.5 w-3.5" /> {{ newBatches.length ? 'Add another batch' : 'Add batch' }}
                                </button>
                            </template>
                        </div>
                    </div>

                    <!-- footer -->
                    <div v-if="activeTab === 'update'" class="pb-2 text-center text-sm">
                        <span class="text-red-600">Changing buying Prices affects Profits!!..</span>
                    </div>
                    <div class="flex w-full items-center justify-center gap-3 border-t border-gray-200 pt-3">
                        <div class="flex w-full gap-3">
                            <button v-if="activeTab === 'update'"
                                @click="saveChanges"
                                :disabled="pendingChanges.length === 0 || saving"
                                :aria-busy="saving"
                                type="button"
                                class="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-green-500 px-4 py-2 text-sm font-medium text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
                                <LoaderCircle v-if="saving" class="h-4 w-4 animate-spin" aria-hidden="true" />
                                <span>{{ saving ? 'Saving...' : 'Update Stock' }}</span>
                            </button>

                            <button v-else
                                @click="saveNewStock"
                                :disabled="newBatches.length === 0 || addingStock || !!unitProblem"
                                :aria-busy="addingStock"
                                type="button"
                                class="inline-flex w-full items-center justify-center gap-2 cursor-pointer rounded-sm bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
                                <LoaderCircle v-if="addingStock" class="h-4 w-4 animate-spin" aria-hidden="true" />
                                <span>{{ addingStock ? 'Adding...' : 'Add Stock' }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ============ DELETE BATCH MODAL ============ -->
            <div v-if="showDeleteModal && batchToDelete"
                class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-md"
                role="presentation"
                @click.self="closeDeleteModal">
                <div class="w-full max-w-xl space-y-4 rounded-sm bg-white p-5 shadow-xl"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-batch-title">
                    <div class="flex items-center justify-between border-b border-gray-200 pb-3">
                        <h3 id="delete-batch-title" class="text-lg font-medium">Delete Item Unit</h3>
                        <button @click="closeDeleteModal"
                            type="button"
                            aria-label="Close delete dialog"
                            class="cursor-pointer text-gray-400 hover:text-gray-700">
                            <X class="h-4 w-4" />
                        </button>
                    </div>
                    <p class="text-sm text-gray-600">
                        Are you sure you want to delete this batch
                        <span class="font-semibold text-gray-900">{{ batchToDelete.batch_number || 'without a batch number' }}</span>?
                    </p>
                    <div class="flex justify-end gap-2">
                        <button @click="closeDeleteModal"
                            type="button"
                            class="rounded-sm border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                            Cancel
                        </button>
                        <button @click="deleteBatch"
                            :disabled="deleting"
                            type="button"
                            class="rounded-sm border bg-red-600 px-4 py-2 text-sm text-white flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50">
                            <CircleCheck class="w-4 h-4" />{{ deleting ? 'Deleting...' : 'Yes' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* hides the scrollbar but the modal still scrolls (wheel, trackpad, touch) */
.no-scrollbar {
    -ms-overflow-style: none;   /* old Edge */
    scrollbar-width: none;      /* Firefox */
}
.no-scrollbar::-webkit-scrollbar {
    display: none;              /* Chrome, Edge, Safari */
}
</style>
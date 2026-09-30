<script setup>
import { onMounted, ref, reactive, computed, watch } from 'vue'
import { Plus, SquarePenIcon, Trash2, X, CircleCheckIcon, Search } from 'lucide-vue-next'
import api from '@/lib/api'
import toast from '@tsirosgeorge/toastnotification'
import { useProductStore } from '@/stores/productStore'

const productStore = useProductStore()

// ---------- State ----------
const medicines = computed(() => productStore.products || [])
const categories = ref([])
const units = ref([])
const searchQuery = ref('')

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)

const showModal = ref(false)
const showDeleteModal = ref(false)
const isEditingForm = ref(false)
const editingId = ref(null)
const medicineToDelete = ref(null)

// Pagination
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 50, 100, 150, 200]

const form = reactive({
  name: '',
  genericName: '',
  category: '',
  unit_name: '',
  min_quantity: '',
  selling_price: '',
  unit_details: [], // repeatable "pack unit" rows — captured for a future page, not sent yet
})

// ---------- Helpers ----------
const getUnitName = (med) => med.unit_name || med.unit?.unit_name || med.unit?.name || ''

// ---------- Data fetching ----------
onMounted(() => {
  Promise.all([fetchMedicines(), fetchCategories(), fetchUnits()])
})

async function fetchMedicines() {
  // Only show the loading state when there is nothing cached in the store
  if (!productStore.products?.length) loading.value = true

  try {
    const { data } = await api.get('/medicines')
    productStore.setProducts(data)
  } catch (error) {
    console.error('Error fetching medicines', error)
    toast.error('Failed to fetch medicines. Please try again later.')
  } finally {
    loading.value = false
  }
}

async function fetchCategories() {
  try {
    const { data } = await api.get('/categories')
    categories.value = data
  } catch (error) {
    console.error('Error fetching categories', error)
    toast.error('Failed to fetch categories. Please try again later.')
  }
}

async function fetchUnits() {
  try {
    const { data } = await api.get('/units')
    units.value = data
  } catch (error) {
    console.error('Error fetching product units', error)
    toast.error('Failed to fetch product units. Please try again later.')
  }
}

// ---------- Form ----------
function resetForm() {
  form.name = ''
  form.genericName = ''
  form.category = ''
  form.unit_name = ''
  form.min_quantity = ''
  form.selling_price = ''
  form.unit_details = []
}

function addNewMedicine() {
  resetForm()
  editingId.value = null
  isEditingForm.value = false
  showModal.value = true
}

function editMedicine(medicine) {
  form.name = medicine.name || ''
  form.genericName = medicine.genericName || ''
  form.category = medicine.category || ''
  form.unit_name = getUnitName(medicine)
  form.min_quantity = medicine.min_quantity || ''
  form.selling_price = medicine.selling_price || ''
  form.unit_details = medicine.unit_details ? [...medicine.unit_details] : []

  editingId.value = medicine.id
  isEditingForm.value = true
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  resetForm()
}

function addUnitRow() {
  form.unit_details.push({ unit_id: '', quantity: '', selling_price: '' })
}

function removeUnitRow(index) {
  form.unit_details.splice(index, 1)
}

async function saveMedicine() {
  if (!form.name || !form.unit_name) {
    toast.error('Please fill in the required fields: Name and Smallest unit')
    return
  }

  const payload = {
    name: form.name,
    genericName: form.genericName || null,
    category: form.category || null,
    unit_name: form.unit_name,
  }

  saving.value = true
  try {
    if (isEditingForm.value) {
      const { data } = await api.put(`/medicines/${editingId.value}`, payload)
      const index = productStore.products.findIndex((m) => m.id === editingId.value)
      if (index !== -1) productStore.products[index] = data
      toast.success('Medicine updated successfully!')
    } else {
      const { data } = await api.post('/medicines', payload)
      productStore.products.unshift(data)
      toast.success('Medicine registered successfully!')
    }
    closeModal()
  } catch (error) {
    console.error('Error saving medicine', error)
    console.error('Medicine validation response', error.response?.data)

    const validationErrors = error.response?.data?.errors
    const firstValidationError = validationErrors
      ? Object.values(validationErrors).flat()[0]
      : null

    toast.error(
      firstValidationError ||
        error.response?.data?.message ||
        'Failed to save medicine. Please try again.'
    )
  } finally {
    saving.value = false
  }
}

// ---------- Delete ----------
function confirmDelete(med) {
  medicineToDelete.value = med
  showDeleteModal.value = true
}

function cancelDelete() {
  showDeleteModal.value = false
  medicineToDelete.value = null
}

async function deleteMedicine() {
  if (!medicineToDelete.value) return

  deleting.value = true
  try {
    const id = medicineToDelete.value.id
    await api.delete(`/medicines/${id}`)
    productStore.products = productStore.products.filter((m) => m.id !== id)
    toast.success('Medicine deleted successfully!')
    cancelDelete()
  } catch (error) {
    console.error('Error deleting medicine', error)
    toast.error('Medicine could not be deleted.')
  } finally {
    deleting.value = false
  }
}

// ---------- Search ----------
const filteredMedicines = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return medicines.value

  return medicines.value.filter((med) =>
    [med.name, med.genericName, med.category, getUnitName(med)]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query))
  )
})

// ---------- Pagination (works on the filtered list) ----------
const totalPages = computed(() => Math.ceil(filteredMedicines.value.length / pageSize.value) || 1)

const paginatedMedicines = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredMedicines.value.slice(start, start + pageSize.value)
})

const visiblePageNumbers = computed(() =>
  Array.from({ length: totalPages.value }, (_, i) => i + 1)
)

// Go back to page 1 whenever the result set changes
watch([pageSize, searchQuery, () => medicines.value.length], () => {
  currentPage.value = 1
})

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}
</script>

<template>
  <!-- No fixed height / overflow here: the whole page scrolls, not the table -->
  <div class="max-w-7xl mx-auto flex flex-col space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-base font-medium text-gray-500 uppercase tracking-wide">Products</h1>
        <p class="text-sm text-gray-500">Manage medicines and track stock levels</p>
      </div>
      <button
        @click="addNewMedicine"
        class="flex items-center gap-2 rounded-sm bg-green-600 px-2 py-2 text-xs font-medium text-white transition hover:bg-green-700 cursor-pointer"
      >
        <Plus class="w-4 h-4" /> New Product
      </button>
    </div>

    <!-- Page size (left) + search (right) -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2 text-xs text-gray-600">
        <span>Show</span>
        <select v-model="pageSize" class="w-auto rounded-sm border border-gray-300 px-2 py-1 text-xs">
          <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
        </select>
        <span>entries</span>
      </div>

      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search..."
          class="w-full rounded-sm border border-gray-400 py-2 pl-9 pr-9 text-xs outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          type="button"
          aria-label="Clear search"
          class="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-gray-400 hover:text-gray-600"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-sm">
      <table class="w-full text-left text-sm text-gray-600 ">
        <thead class="border-b border-gray-200 text-xs tracking-wide text-gray-500">
          <tr>
            <th class="px-2 py-4 font-medium">#</th>
            <th class="px-2 py-4 font-semibold">Medicine Name</th>
            <th class="px-2 py-4 font-semibold">Generic Name</th>
            <th class="px-2 py-4 font-semibold">Smallest Unit</th>
            <th class="px-2 py-4 font-semibold">Category</th>
            <th class="px-5 py-4 font-semibold">Actions</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <tr v-if="filteredMedicines.length === 0">
            <td class="px-5 py-12 text-center text-gray-500" colspan="6">
              {{ searchQuery ? 'No products match your search' : 'No products available' }}
            </td>
          </tr>

          <tr
            v-for="(med, index) in paginatedMedicines"
            :key="med.id"
            class="transition-colors hover:bg-green-50/40"
          >
            <td class="px-2 py-2 font-medium">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
            <td class="px-2 py-2 font-semibold text-gray-900">{{ med.name }}</td>
            <td class="px-2 py-2 text-gray-500">{{ med.genericName || 'Not provided' }}</td>
            <td class="px-2 py-2">
              <span
                v-if="getUnitName(med)"
                class="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
              >
                {{ getUnitName(med) }}
              </span>
              <span v-else class="text-gray-400">Not provided</span>
            </td>
            <td class="px-2 py-2">
              <span
                v-if="med.category"
                class="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
              >
                {{ med.category }}
              </span>
              <span v-else class="text-gray-400">Not provided</span>
            </td>
            <td class="px-5 py-2">
              <div class="flex items-center">
                <button
                  @click="editMedicine(med)"
                  :aria-label="`Edit ${med.name}`"
                  class="flex h-7 w-7 items-center justify-center rounded-l-sm bg-green-500 text-white transition hover:bg-green-100 hover:text-green-700 cursor-pointer"
                >
                  <SquarePenIcon class="h-4 w-4" />
                </button>
                <button
                  @click="confirmDelete(med)"
                  :aria-label="`Delete ${med.name}`"
                  class="flex h-7 w-7 items-center justify-center rounded-r-sm bg-red-500 text-white transition hover:bg-red-100 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="flex justify-end px-2 py-3 text-xs text-gray-600">
        <div class="flex items-center gap-2">
          <span>Page {{ currentPage }} of {{ totalPages }}</span>
          <button
            v-for="page in visiblePageNumbers"
            :key="page"
            @click="goToPage(page)"
            :class="[
              'min-w-[28px] rounded-sm border px-2 py-1 text-xs',
              page === currentPage
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-gray-400 hover:bg-gray-100',
            ]"
          >
            {{ page }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div class="p-6">
          <h2 class="text-lg font-semibold text-gray-800">Delete Product</h2>
          <p class="mt-2 text-sm text-gray-500">
            Are you sure you want to delete
            <span class="font-semibold text-gray-700">{{ medicineToDelete?.name }}</span>?
            This action cannot be undone.
          </p>
        </div>
        <div class="flex justify-end gap-3 border-t border-gray-200 p-4">
          <button
            @click="cancelDelete"
            class="rounded-sm border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="deleteMedicine"
            :disabled="deleting"
            class="rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
          >
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Register / edit modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 class="text-xl font-medium text-gray-800">
            {{ isEditingForm ? 'Edit Product' : 'New Product' }}
          </h2>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <X class="h-5 w-5" />
          </button>
        </div>

        <form @submit.prevent="saveMedicine" class="space-y-4 p-6">
          <!-- Names -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-semibold text-gray-700">Medicine Name</label>
              <input
                v-model="form.name"
                type="text"
                required
                placeholder="e.g. Amoxil"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-gray-700">Generic Name</label>
              <input
                v-model="form.genericName"
                type="text"
                placeholder="e.g. Amoxicillin"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <!-- Category, unit, quantity, price -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label class="mb-1 block text-xs font-semibold text-gray-700">Category</label>
              <select
                v-model="form.category"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select category...</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.Category_name">
                  {{ cat.Category_name }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-gray-500">Smallest unit</label>
              <select
                v-model="form.unit_name"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select unit...</option>
                <option v-for="u in units" :key="u.id" :value="u.unit_name">
                  {{ u.unit_name }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-gray-500">Min Quantity</label>
              <input
                v-model="form.min_quantity"
                type="number"
                min="1"
                step="1"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-gray-500">Selling Price</label>
              <input
                v-model="form.selling_price"
                type="number"
                min="0"
                step="0.01"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <!-- Big quantities -->
          <div class="border-t border-gray-200 pt-4">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-700">
                Big quantities
              </h3>
              <button
                type="button"
                @click="addUnitRow"
                class="flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800 cursor-pointer"
              >
                <Plus class="h-3.5 w-3.5" /> Add Big Quantities
              </button>
            </div>

            <p v-if="form.unit_details.length === 0" class="text-xs text-gray-400">
              No big quantities added yet. Click "Add Big Quantities" if this product is also sold
              in packs (e.g. a Box of 25 Tablets).
            </p>

            <div
              v-for="(row, rIndex) in form.unit_details"
              :key="rIndex"
              class="mb-3 grid grid-cols-12 items-end gap-2"
            >
              <div class="col-span-4">
                <label class="mb-1 block text-[11px] font-semibold text-gray-500">
                  <span class="mr-2 text-gray-500">1</span>Unit
                </label>
                <select
                  v-model="row.unit_id"
                  class="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select unit...</option>
                  <option v-for="u in units" :key="u.id" :value="u.id">
                    {{ u.unit_name }}
                  </option>
                </select>
              </div>

              <div class="col-span-3">
                <label class="mb-1 block text-[11px] font-semibold text-gray-500">
                  Contains ({{ form.unit_name || 'smallest unit' }})
                </label>
                <input
                  v-model.number="row.quantity"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 25"
                  class="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div class="col-span-4">
                <label class="mb-1 block text-[11px] font-semibold text-gray-500">
                  Selling Price
                </label>
                <input
                  v-model.number="row.selling_price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div class="col-span-1 flex justify-end">
                <button
                  type="button"
                  @click="removeUnitRow(rIndex)"
                  :aria-label="`Remove unit row ${rIndex + 1}`"
                  class="flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              @click="closeModal"
              class="rounded-sm border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="flex items-center gap-2 rounded-sm bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer"
            >
              <CircleCheckIcon class="h-4 w-4" />
              {{ saving ? 'Saving...' : isEditingForm ? 'Save changes' : 'Yes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
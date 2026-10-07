<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import api from '@/lib/api'
import toast from '@tsirosgeorge/toastnotification'
import {
  CircleCheck,
  Download,
  Upload,
  Plus,
  SquarePenIcon,
  Trash2,
  X,
  Search,
  FileSpreadsheet,
} from 'lucide-vue-next'
import { useSuppliersStore } from '@/stores/suppliersStore'

const supplierStore = useSuppliersStore()

// ---------- State ----------
const suppliers = computed(() => supplierStore.suppliers || [])
const searchQuery = ref('')
const loggedUser = ref(null)

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const importing = ref(false)

const showModal = ref(false)
const showDeleteModal = ref(false)
const showImportModal = ref(false)
const isEditingForm = ref(false)
const editingId = ref(null)
const supplierToDelete = ref(null)

// Import modal
const selectedFile = ref(null)
const fileInput = ref(null)

// Pagination
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 50, 100, 150, 200]

const form = reactive({
  name: '',
  contact: '',
  address: '',
})

try {
  loggedUser.value = JSON.parse(localStorage.getItem('user') || 'null')
} catch {
  loggedUser.value = null
}

// ---------- Data fetching ----------
onMounted(fetchSuppliers)

async function fetchSuppliers() {
  // Only show the loading state when there is nothing cached in the store
  if (!supplierStore.suppliers?.length) loading.value = true

  try {
    const { data } = await api.get('/suppliers')
    const list = Array.isArray(data) ? data : data?.suppliers || data?.data || []
    supplierStore.setSuppliers(
      list.map((supplier) => ({ ...supplier, contact: String(supplier.contact ?? '') }))
    )
  } catch (error) {
    console.error('Failed to fetch system suppliers', error)
    if (!supplierStore.suppliers?.length) {
      toast.error('Failed to fetch system suppliers. Please check your backend connection.')
    }
  } finally {
    loading.value = false
  }
}

// ---------- Search ----------
const filteredSuppliers = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return suppliers.value

  return suppliers.value.filter((s) =>
    [s.name, s.contact, s.address].some((value) =>
      String(value ?? '').toLowerCase().includes(query)
    )
  )
})

// ---------- Pagination (works on the filtered list) ----------
const totalPages = computed(() => Math.ceil(filteredSuppliers.value.length / pageSize.value) || 1)

const paginatedSuppliers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredSuppliers.value.slice(start, start + pageSize.value)
})

const visiblePageNumbers = computed(() =>
  Array.from({ length: totalPages.value }, (_, i) => i + 1)
)

// Go back to page 1 whenever the result set changes
watch([pageSize, searchQuery, () => suppliers.value.length], () => {
  currentPage.value = 1
})

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

// ---------- Form ----------
function resetForm() {
  form.name = ''
  form.contact = ''
  form.address = ''
}

function addNewSupplier() {
  resetForm()
  editingId.value = null
  isEditingForm.value = false
  showModal.value = true
}

function editSupplier(sup) {
  form.name = sup.name
  form.contact = String(sup.contact ?? '')
  form.address = sup.address

  editingId.value = sup.id
  isEditingForm.value = true
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  resetForm()
}

async function saveSupplier() {
  if (!form.name || !form.contact || !form.address) {
    toast.error('Please fill in all the required fields.')
    return
  }

  const payload = {
    name: form.name,
    contact: String(form.contact),
    address: form.address,
  }

  saving.value = true
  try {
    if (isEditingForm.value) {
      const { data } = await api.put(`/suppliers/${editingId.value}`, payload)
      const index = supplierStore.suppliers.findIndex((s) => s.id === editingId.value)
      if (index !== -1) supplierStore.suppliers[index] = data
      toast.success('System supplier updated successfully')
    } else {
      const { data } = await api.post('/suppliers', payload)
      supplierStore.suppliers.unshift(data)
      toast.success('System supplier registered successfully')
    }
    closeModal()
  } catch (error) {
    console.error('Failed to save system supplier', error)
    toast.error('Failed to save system supplier.')
  } finally {
    saving.value = false
  }
}

// ---------- Delete ----------
function confirmDelete(sup) {
  supplierToDelete.value = sup
  showDeleteModal.value = true
}

function cancelDelete() {
  showDeleteModal.value = false
  supplierToDelete.value = null
}

async function deleteSupplier() {
  if (!supplierToDelete.value) return

  deleting.value = true
  try {
    const id = supplierToDelete.value.id
    await api.delete(`/suppliers/${id}`)
    supplierStore.suppliers = supplierStore.suppliers.filter((s) => s.id !== id)
    toast.success('System supplier deleted successfully')
    cancelDelete()
  } catch (error) {
    console.error('Failed to delete supplier', error)
    toast.error('Failed to delete supplier')
  } finally {
    deleting.value = false
  }
}

// ---------- Export / template ----------
async function exportSuppliers() {
  try {
    const response = await api.get('/suppliers/export', { responseType: 'blob' })
    downloadFile(response.data, 'suppliers.xlsx')
  } catch (error) {
    console.error('Failed to export suppliers', error)
    toast.error('Failed to export suppliers.')
  }
}

async function downloadTemplate() {
  try {
    const response = await api.get('/suppliers/template', { responseType: 'blob' })
    downloadFile(response.data, 'supplier-template.xlsx')
  } catch (error) {
    console.error('Failed to download template', error)
    toast.error('Failed to download template.')
  }
}

// Shared helper: takes the raw file data and makes the browser save it
function downloadFile(blobData, filename) {
  const blob = new Blob([blobData], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

// ---------- Import ----------
function openImportModal() {
  selectedFile.value = null
  showImportModal.value = true
}

function closeImportModal() {
  showImportModal.value = false
  selectedFile.value = null
}

function triggerFileSelect() {
  fileInput.value?.click()
}

function handleFileSelected(event) {
  const file = event.target.files[0]
  if (!file) return

  const allowedExtensions = ['.xlsx', '.xls', '.csv']
  const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`

  if (!allowedExtensions.includes(fileExtension)) {
    toast.error('Please select an Excel or CSV file.')
    selectedFile.value = null
  } else {
    selectedFile.value = file
  }

  event.target.value = ''
}

async function submitImport() {
  if (!selectedFile.value) {
    toast.error('Please select a file first')
    return
  }

  const formData = new FormData()
  formData.append('file', selectedFile.value)

  importing.value = true
  try {
    await api.post('/suppliers/import', formData)
    toast.success('Suppliers imported successfully')
    await fetchSuppliers()
    closeImportModal()
  } catch (error) {
    console.error('Failed to import file', error)
    toast.error('Failed to import file')
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <!-- No fixed height / overflow here: the whole page scrolls, not the table -->
  <div class="w-full">
    <div class=" flex flex-col p-2 pb-10">
      <!-- Header / breadcrumb -->
      <div class="flex items-center justify-between border-b border-gray-200 p-4">
        <h2 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
          System Suppliers
        </h2>
        <div class="text-sm font-medium">
          <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
          <span class="text-gray-400"> / Suppliers</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap items-center justify-end gap-2 px-4 pt-4">
        <button
          @click="openImportModal"
          type="button"
          class="flex items-center gap-2 rounded-sm border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 cursor-pointer"
        >
          <Upload class="h-4 w-4" />
          Import
        </button>
        <button
          @click="exportSuppliers"
          type="button"
          class="flex items-center gap-2 rounded-sm border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 cursor-pointer"
        >
          <Download class="h-4 w-4" />
          Export
        </button>
        <button
          @click="downloadTemplate"
          type="button"
          class="flex items-center gap-2 rounded-sm border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 cursor-pointer"
        >
          <FileSpreadsheet class="h-4 w-4" />
          Template
        </button>
        <button
          @click="addNewSupplier"
          type="button"
          class="flex items-center gap-2 rounded-sm bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green-700 cursor-pointer"
        >
          <Plus class="h-4 w-4" />
          New Supplier
        </button>
      </div>

      <!-- Show entries (left) + search (right) -->
      <div class="flex items-center justify-between gap-4 px-4 py-4">
        <div class="flex items-center gap-2 text-xs ">
          <span>Show</span>
          <select v-model="pageSize" class="w-auto rounded-sm border border-gray-300 px-2 py-1 text-xs">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
          </select>
          <span>entries</span>
        </div>

        <div class="flex items-center gap-2">
            <span class="font-medium whitespace-nowrap text-sm">Search:</span>
            <div class="relative ml-auto w-full max-w-[220px]">
            <Search class="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
                v-model="searchQuery"
                type="text"
                placeholder="Search suppliers..."
                class="w-full rounded-sm border border-gray-300 py-1.5 pl-8 pr-8 text-xs outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                type="button"
                aria-label="Clear search"
                class="absolute right-2 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center text-gray-400 hover:text-gray-600"
            >
                <X class="h-4 w-4 cursor-pointer" />
            </button>
            </div>
        </div>
      </div>

      <!-- Table + pagination -->
      <div class="bg-white shadow-sm rounded-sm">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 text-xs tracking-wide text-gray-600">
            <tr>
              <th class="px-4 py-3 font-semibold">#</th>
              <th class="px-4 py-3 font-semibold">Name</th>
              <th class="px-4 py-3 font-semibold">Contact</th>
              <th class="px-4 py-3 font-semibold">Address</th>
              <th class="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading">
              <td class="px-4 py-12 text-center text-gray-400" colspan="5">Loading suppliers...</td>
            </tr>
            <tr v-else-if="!suppliers.length">
              <td class="px-4 py-12 text-center text-gray-400" colspan="5">No suppliers found</td>
            </tr>
            <tr v-else-if="filteredSuppliers.length === 0">
              <td class="px-4 py-12 text-center text-gray-500" colspan="5">
                No suppliers match "{{ searchQuery }}"
              </td>
            </tr>

            <template v-else>
              <tr
                v-for="(supp, index) in paginatedSuppliers"
                :key="supp.id"
                class="transition-colors hover:bg-green-50/40"
              >
                <td class="px-4 py-3 text-gray-500">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td class="px-4 py-3 font-medium text-gray-900">{{ supp.name }}</td>
                <td class="px-4 py-3 text-gray-600">{{ supp.contact }}</td>
                <td class="px-4 py-3 text-gray-600">{{ supp.address }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center">
                    <button
                      @click="editSupplier(supp)"
                      :aria-label="`Edit ${supp.name}`"
                      class="flex h-7 w-7 items-center justify-center rounded-l-sm bg-green-600 text-white transition hover:bg-green-700 cursor-pointer"
                    >
                      <SquarePenIcon class="h-4 w-4" />
                    </button>
                    <button
                      @click="confirmDelete(supp)"
                      :aria-label="`Delete ${supp.name}`"
                      class="flex h-7 w-7 items-center justify-center rounded-r-sm bg-red-600 text-white transition hover:bg-red-700 cursor-pointer"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="flex items-center justify-end  px-4 py-3 text-xs text-gray-600">
          <div class="flex items-center gap-1.5">
            <span class="mr-1">Page {{ currentPage }} of {{ totalPages }}</span>
            <button
              v-for="page in visiblePageNumbers"
              :key="page"
              type="button"
              @click="goToPage(page)"
              :class="[
                'flex h-7 w-7 items-center justify-center rounded-full border text-xs',
                page === currentPage
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-gray-300 hover:bg-gray-100',
              ]"
            >
              {{ page }}
            </button>
          </div>
        </div>
      </div>

      <!-- Register / edit modal -->
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      >
        <div class="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
          <div class="flex items-center justify-between border-b border-gray-200 p-4 sm:p-6">
            <h2 class="text-base font-semibold text-gray-700 sm:text-lg">
              {{ isEditingForm ? 'Edit System Supplier' : 'New Supplier' }}
            </h2>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <X class="h-4 w-4" />
            </button>
          </div>

          <form @submit.prevent="saveSupplier" class="space-y-4 p-4 sm:p-6">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700">Name</label>
              <input
                v-model="form.name"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700">Contact</label>
              <input
                v-model="form.contact"
                type="tel"
                inputmode="numeric"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700">Address</label>
              <input
                v-model="form.address"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div class="flex flex-col-reverse justify-end gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center">
              <button
                type="button"
                @click="closeModal"
                class="w-full rounded-sm border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="flex w-full items-center justify-center gap-2 rounded-sm bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 sm:w-auto cursor-pointer"
              >
                <CircleCheck class="h-4 w-4 shrink-0" aria-hidden="true" />
                {{ saving ? 'Saving...' : isEditingForm ? 'Update' : 'Submit' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Delete modal -->
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      >
        <div class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <h2 class="text-lg font-semibold text-gray-800">Delete System Supplier</h2>
          <p class="mb-4 mt-2 text-sm text-gray-500">
            Are you sure you want to delete
            <span class="font-semibold text-gray-800">"{{ supplierToDelete?.name }}"</span>?
            This cannot be undone.
          </p>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="cancelDelete"
              class="rounded-sm border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="deleteSupplier"
              :disabled="deleting"
              class="flex items-center justify-center gap-1 rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
            >
              <CircleCheck class="h-4 w-4" />
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Import modal -->
      <div
        v-if="showImportModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      >
        <div class="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl sm:p-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-base font-semibold text-gray-700">Import Suppliers</h2>
            <button @click="closeImportModal" type="button" class="text-gray-400 hover:text-gray-600">
              <X class="h-4 w-4" />
            </button>
          </div>

          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls,.csv"
            class="hidden"
            @change="handleFileSelected"
          />

          <!-- Click anywhere in the box to pick a file -->
          <button
            type="button"
            @click="triggerFileSelect"
            class="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition hover:border-green-500 hover:bg-green-50/40 cursor-pointer"
          >
            <Upload class="mb-2 h-6 w-6 text-gray-400" />
            <span class="text-sm font-medium text-gray-700">Click to choose a file</span>
            <span class="mt-1 text-xs text-gray-500">Excel (.xlsx, .xls) or CSV</span>
            <span
              v-if="selectedFile"
              class="mt-3 max-w-full truncate text-xs font-semibold text-green-600"
            >
              Selected: {{ selectedFile.name }}
            </span>
          </button>

          <div class="mt-4 flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              @click="closeImportModal"
              class="rounded-sm border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="submitImport"
              :disabled="importing || !selectedFile"
              class="rounded-sm bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ importing ? 'Importing...' : 'Import' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
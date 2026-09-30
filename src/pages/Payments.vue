<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue'
import api from '@/lib/api'
import toast from '@tsirosgeorge/toastnotification'
import { X, Plus, Trash2, SquarePenIcon, LockKeyhole, Check, CheckCheckIcon, CircleCheck, Search } from 'lucide-vue-next'

// ---------- State ----------
const paymentOptions = ref([])
const searchQuery = ref('')
const loggedUser = ref(null)

const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const settingDefaultId = ref(null)

const showModal = ref(false)
const showDeleteModal = ref(false)
const isEditingForm = ref(false)
const editingId = ref(null)
const optionToDelete = ref(null)

// Pagination
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 50, 100, 150, 200]

const form = reactive({
  name: '',
  account_number: '',
})

try {
  loggedUser.value = JSON.parse(localStorage.getItem('user') || 'null')
} catch {
  loggedUser.value = null
}

// ---------- Data fetching ----------
onMounted(fetchPaymentOptions)

async function fetchPaymentOptions() {
  loading.value = true
  try {
    const { data } = await api.get('/paymentOptions')
    paymentOptions.value = data
  } catch (error) {
    console.error('Error fetching payment options', error)
    toast.error('Error fetching payment options')
  } finally {
    loading.value = false
  }
}

// ---------- Default option ----------
async function setDefault(option) {
  if (option.is_default) return

  settingDefaultId.value = option.id
  try {
    await api.post(`/paymentOptions/${option.id}/set-default`)
    paymentOptions.value = paymentOptions.value.map((o) => ({
      ...o,
      is_default: o.id === option.id,
    }))
    toast.success(`"${option.name}" set as default`)
  } catch (error) {
    console.error('Failed to set default payment option', error)
    toast.error('Failed to update default payment option.')
  } finally {
    settingDefaultId.value = null
  }
}

// ---------- Form ----------
function resetForm() {
  form.name = ''
  form.account_number = ''
}

function addPayment() {
  resetForm()
  editingId.value = null
  isEditingForm.value = false
  showModal.value = true
}

function editPayment(payment) {
  form.name = payment.name
  form.account_number = payment.account_number

  editingId.value = payment.id
  isEditingForm.value = true
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  isEditingForm.value = false
  editingId.value = null
  resetForm()
}

async function saveOption() {
  if (!form.name || !form.account_number) {
    toast.error('Please fill in all fields.')
    return
  }

  const payload = {
    name: form.name,
    account_number: form.account_number,
  }

  saving.value = true
  try {
    if (isEditingForm.value) {
      const { data } = await api.put(`/paymentOptions/${editingId.value}`, payload)
      const index = paymentOptions.value.findIndex((p) => p.id === editingId.value)
      if (index !== -1) paymentOptions.value[index] = data
      toast.success('Payment option updated successfully')
    } else {
      const { data } = await api.post('/paymentOptions', payload)
      paymentOptions.value.unshift(data)
      toast.success('Payment option registered successfully')
    }
    closeModal()
  } catch (error) {
    console.error('Failed to save payment option', error)
    toast.error('Failed to save payment option')
  } finally {
    saving.value = false
  }
}

// ---------- Delete ----------
function confirmDelete(payopt) {
  optionToDelete.value = payopt
  showDeleteModal.value = true
}

function cancelDelete() {
  showDeleteModal.value = false
  optionToDelete.value = null
}

async function deletePayment() {
  if (!optionToDelete.value) return

  deleting.value = true
  try {
    const id = optionToDelete.value.id
    await api.delete(`/paymentOptions/${id}`)
    paymentOptions.value = paymentOptions.value.filter((p) => p.id !== id)
    toast.success('Payment option deleted successfully')
    cancelDelete()
  } catch (error) {
    console.error('Failed to delete payment option', error)
    toast.error('Failed to delete payment option')
  } finally {
    deleting.value = false
  }
}

// ---------- Search ----------
const filteredPayments = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return paymentOptions.value

  return paymentOptions.value.filter(
    (p) =>
      (p.name ?? '').toLowerCase().includes(query) ||
      (p.account_number ?? '').toLowerCase().includes(query)
  )
})

// ---------- Pagination (works on the filtered list) ----------
const totalPages = computed(() => Math.ceil(filteredPayments.value.length / pageSize.value) || 1)

const paginatedOptions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredPayments.value.slice(start, start + pageSize.value)
})

const visiblePageNumbers = computed(() =>
  Array.from({ length: totalPages.value }, (_, i) => i + 1)
)

// Go back to page 1 whenever the result set changes
watch([pageSize, searchQuery, () => paymentOptions.value.length], () => {
  currentPage.value = 1
})

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}
</script>

<template>
  <!-- No fixed height / overflow here: the whole page scrolls, not the table -->
  <div class="w-full">
    <div class="max-w-7xl mx-auto flex flex-col p-2 pb-5">
      <!-- Header / breadcrumb -->
      <div class="flex items-center justify-between px-2 py-1">
        <h2 class="flex items-center gap-2 text-sm font-medium uppercase">Payment Options</h2>
        <h2 class="text-sm font-medium">
          <router-link to="/dashboard" class="font-medium text-black">Dashboard</router-link>
          <span class="text-gray-400"> / Payment Options</span>
        </h2>
      </div>

      <!-- New option button -->
      <div class="flex items-center justify-end p-4 pb-2">
        <button
          @click="addPayment"
          class="flex items-center rounded-sm bg-green-500 px-2 py-1.5 text-xs text-white cursor-pointer hover:bg-green-600"
        >
          <Plus class="h-4 w-4" /> New Option
        </button>
      </div>

      <!-- Show entries (left) + search (right) -->
      <div class="flex items-center justify-between gap-4 px-4 pb-2">
        <div class="flex items-center gap-2 text-xs">
          <span>Show</span>
          <select v-model="pageSize" class="w-auto rounded-sm border border-gray-400 px-2 py-1 text-xs">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
          </select>
          <span>entries</span>
        </div>

        <div class="relative ml-auto w-full max-w-[200px]">
          <Search class="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search payment options..."
            class="w-full rounded-sm border border-gray-400 py-1.5 pl-8 pr-8 text-xs outline-none focus:ring-2 focus:ring-green-500"
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

      <!-- Table + pagination live in the same container -->
      <div class="mt-2 bg-white">
        <table class="w-full text-left text-xs">
          <thead class="border-b border-gray-400 tracking-wide text-black">
            <tr>
              <th scope="col" class="px-2 py-2 font-medium">#</th>
              <th scope="col" class="px-2 py-2 font-medium">Name</th>
              <th scope="col" class="px-2 py-2 font-medium">Account Number</th>
              <th scope="col" class="px-2 py-2 font-medium">Default</th>
              <th scope="col" class="px-2 py-2 font-medium">Added By</th>
              <th scope="col" class="px-2 py-2 font-medium">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-200">
            <tr v-if="loading">
              <td class="px-4 py-14 text-center text-gray-600" colspan="6">Loading options...</td>
            </tr>
            <tr v-else-if="!paymentOptions.length">
              <td class="px-4 py-12 text-center text-gray-500" colspan="6">No payment options found</td>
            </tr>
            <tr v-else-if="filteredPayments.length === 0">
              <td class="px-4 py-12 text-center text-gray-500" colspan="6">
                No payment options match "{{ searchQuery }}"
              </td>
            </tr>

            <tr v-for="(pay, index) in paginatedOptions" :key="pay.id">
              <td class="px-2 py-2 font-medium">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td class="px-2 py-2 font-medium">{{ pay.name }}</td>
              <td class="px-2 py-2 font-medium">{{ pay.account_number }}</td>
              <td class="px-2 py-2 font-medium">
                <button
                  @click="setDefault(pay)"
                  :disabled="settingDefaultId === pay.id || pay.is_default"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
                  :class="
                    pay.is_default
                      ? 'cursor-default border-green-600 bg-green-600 text-white'
                      : 'cursor-pointer border-gray-400 bg-white text-gray-700 hover:border-green-500 hover:text-green-600'
                  "
                  :title="pay.is_default ? 'Default payment option' : 'Set as default'"
                >
                  <Check v-if="pay.is_default" class="h-4 w-4" />
                  <LockKeyhole v-else class="h-3.5 w-3.5" />
                </button>
              </td>
              <td class="px-2 py-2 font-medium">{{ pay.added_by_user?.name ?? '-' }}</td>
              <td class="px-2 py-2">
                <div class="flex items-center">
                  <button
                    @click="editPayment(pay)"
                    aria-label="Edit payment option"
                    class="flex h-7 w-7 items-center justify-center rounded-l-sm bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                  >
                    <SquarePenIcon class="h-4 w-4" />
                  </button>
                  <button
                    @click="confirmDelete(pay)"
                    aria-label="Delete payment option"
                    class="flex h-7 w-7 items-center justify-center rounded-r-sm bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div class="flex justify-end border-t border-slate-200 px-2 py-3 text-xs text-gray-600">
          <div class="flex items-center gap-2">
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <button
              v-for="page in visiblePageNumbers"
              :key="page"
              @click="goToPage(page)"
              :class="[
                'min-w-[28px] rounded-sm border px-2.5 py-1 text-xs',
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
        <div class="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-gray-200 p-4 sm:p-6">
            <h2 class="text-sm font-medium text-gray-600">
              {{ isEditingForm ? 'Edit Payment Option' : 'New Payment Option' }}
            </h2>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <X class="h-4 w-4" />
            </button>
          </div>

          <form @submit.prevent="saveOption" class="space-y-4 p-4 sm:p-6">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700">Name</label>
              <input
                v-model="form.name"
                type="text"
                class="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700">Account Number</label>
              <input
                v-model="form.account_number"
                type="text"
                class="w-full rounded-sm border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div class="flex flex-col-reverse justify-end gap-3 border-t border-gray-300 pt-4 sm:flex-row sm:items-center">
              <button
                type="button"
                @click="closeModal"
                class="rounded-sm border border-gray-500 bg-gray-500 px-4 py-2 text-sm text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="flex items-center justify-center gap-3 rounded-sm border border-gray-300 bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50 cursor-pointer"
              >
                <CheckCheckIcon class="h-4 w-4 shrink-0" />
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
        <div class="w-full max-w-2xl rounded-sm bg-white p-6 shadow-sm">
          <h2 class="text-lg font-medium">Delete Payment Option</h2>
          <p class="mb-4 mt-2 text-sm font-medium text-gray-400">
            Are you sure you want to delete
            <span class="font-bold text-gray-800">"{{ optionToDelete?.name }}"</span>?
            This cannot be undone.
          </p>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              @click="cancelDelete"
              class="rounded-sm border border-gray-500 bg-gray-500 px-4 py-2 text-sm text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="deletePayment"
              :disabled="deleting"
              class="flex items-center justify-center gap-1 rounded-sm bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50 cursor-pointer"
            >
              <CircleCheck class="h-4 w-4" />
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
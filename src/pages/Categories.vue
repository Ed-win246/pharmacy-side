<script setup>
import { onMounted, reactive, ref, computed, watch } from 'vue'
import { Plus, Trash2, X, SquarePenIcon, CircleCheckIcon, Search } from 'lucide-vue-next'
import toast from '@tsirosgeorge/toastnotification'
import api from '@/lib/api'
import { useCategoryStore } from '@/stores/categoryStore'

const categoryStore = useCategoryStore()

// ---------- State ----------
const categories = computed(() => categoryStore.categories || [])
const searchQuery = ref('')
const loggedUser = ref(null)

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)

const showModal = ref(false)
const showDeleteModal = ref(false)
const isEditingForm = ref(false)
const editingId = ref(null)
const categoryToDelete = ref(null)

// Pagination
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 50, 100, 150, 200]

const form = reactive({
  Category_name: '',
})

try {
  loggedUser.value = JSON.parse(localStorage.getItem('user') || 'null')
} catch {
  loggedUser.value = null
}

// ---------- Data fetching ----------
onMounted(fetchCategories)

async function fetchCategories() {
  // Only show the loading state when there is nothing cached in the store
  if (!categoryStore.categories?.length) loading.value = true

  try {
    const { data } = await api.get('/categories')
    categoryStore.setCategories(data)
  } catch (error) {
    console.error('Error fetching categories', error)
    toast.error('Failed to fetch categories. Please try again later.')
  } finally {
    loading.value = false
  }
}

// ---------- Search ----------
const filteredCategories = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return categories.value

  return categories.value.filter((cat) =>
    String(cat.Category_name || '').toLowerCase().includes(query)
  )
})

// ---------- Pagination (works on the filtered list) ----------
const totalPages = computed(() => Math.ceil(filteredCategories.value.length / pageSize.value) || 1)

const paginatedCategories = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredCategories.value.slice(start, start + pageSize.value)
})

const visiblePageNumbers = computed(() =>
  Array.from({ length: totalPages.value }, (_, i) => i + 1)
)

// Go back to page 1 whenever the result set changes
watch([pageSize, searchQuery, () => categories.value.length], () => {
  currentPage.value = 1
})

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

// ---------- Form ----------
function resetForm() {
  form.Category_name = ''
}

function addNewCategory() {
  resetForm()
  editingId.value = null
  isEditingForm.value = false
  showModal.value = true
}

function editCategory(category) {
  form.Category_name = category.Category_name || ''
  editingId.value = category.id
  isEditingForm.value = true
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  resetForm()
}

async function saveCategory() {
  if (!form.Category_name) {
    toast.error('Please fill in the required field: Name')
    return
  }

  const payload = { Category_name: form.Category_name }

  saving.value = true
  try {
    if (isEditingForm.value) {
      const { data } = await api.put(`/categories/${editingId.value}`, payload)
      const index = categoryStore.categories.findIndex((c) => c.id === editingId.value)
      if (index !== -1) categoryStore.categories[index] = data
      toast.success('Product category updated successfully')
    } else {
      const { data } = await api.post('/categories', payload)
      categoryStore.categories.unshift(data)
      toast.success('Product category registered successfully')
    }
    closeModal()
  } catch (error) {
    console.error('Error saving product category', error)
    toast.error('Failed to save product category. Please try again.')
  } finally {
    saving.value = false
  }
}

// ---------- Delete ----------
function confirmDelete(cat) {
  categoryToDelete.value = cat
  showDeleteModal.value = true
}

function cancelDelete() {
  showDeleteModal.value = false
  categoryToDelete.value = null
}

async function deleteCategory() {
  if (!categoryToDelete.value) return

  deleting.value = true
  try {
    const id = categoryToDelete.value.id
    await api.delete(`/categories/${id}`)
    categoryStore.categories = categoryStore.categories.filter((c) => c.id !== id)
    toast.success('Product category deleted successfully')
    cancelDelete()
  } catch (error) {
    console.error('Error deleting category', error)
    toast.error('Category could not be deleted.')
  } finally {
    deleting.value = false
  }
}

// ---------- Display helpers ----------
function getAddedBy(category) {
  return (
    category.addedBy?.name ||
    category.addedBy?.email ||
    category.addedByName ||
    category.createdBy?.name ||
    category.createdBy?.email ||
    loggedUser.value?.name ||
    loggedUser.value?.email ||
    'Not available'
  )
}

function formatDateOnly(value) {
  if (!value) return 'Not available'
  return String(value).split(/[T ]/)[0]
}
</script>

<template>
  <!-- No fixed height / overflow here: the whole page scrolls, not the table -->
  <div class="max-w-7xl mx-auto flex flex-col space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-medium uppercase tracking-wide text-gray-700">Product Categories</h2>
        <p class="text-xs text-gray-500">Manage the categories used for your products</p>
      </div>
      <button
        @click="addNewCategory"
        class="flex items-center gap-2 rounded-sm bg-green-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-700 cursor-pointer"
      >
        <Plus class="h-4 w-4" />
        New Category
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

      <div class="flex items-center gap-1">
        <span class="font-medium text-sm whitespace-nowrap">Search:</span>
            <div class="relative w-full max-w-[200px]">
                <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                v-model="searchQuery"
                type="text"
                placeholder="Search category..."
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
    </div>

    <!-- Table -->
    <div class="bg-white shadow-sm rounded-sm">
      <table class="w-full text-left text-sm text-black">
        <thead class="border-b text-xs tracking-wide text-black">
          <tr>
            <th class="px-2 py-4 font-medium">#</th>
            <th class="px-2 py-4 font-medium">Name</th>
            <th class="px-2 py-4 font-medium">Added-by</th>
            <th class="px-2 py-4 font-medium">Added-on</th>
            <th class="px-5 py-4 font-medium">Actions</th>
          </tr>
        </thead>

        <tbody class="divide-y divide-gray-100">
          <tr v-if="filteredCategories.length === 0">
            <td class="px-6 py-12 text-center text-gray-500" colspan="5">
              {{ searchQuery ? 'No product category matches your search' : 'No product category found' }}
            </td>
          </tr>

          <tr v-for="(cat, index) in paginatedCategories" :key="cat.id">
            <td class="px-2 py-2 font-medium">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
            <td class="px-2 py-2 font-medium">{{ cat.Category_name }}</td>
            <td class="px-2 py-2 text-gray-600">{{ getAddedBy(cat) }}</td>
            <td class="px-2 py-2 text-gray-600">
              {{ formatDateOnly(cat.createdAt || cat.created_at || cat.addedDate) }}
            </td>
            <td class="px-5 py-2 text-gray-600">
              <div class="flex items-center">
                <button
                  @click="editCategory(cat)"
                  aria-label="Edit category"
                  class="flex h-7 w-7 items-center justify-center rounded-l-sm bg-green-600 text-white hover:bg-green-100 cursor-pointer hover:text-green-600"
                >
                  <SquarePenIcon class="h-4 w-4" />
                </button>
                <button
                  @click="confirmDelete(cat)"
                  aria-label="Delete category"
                  class="flex h-7 w-7 items-center justify-center rounded-r-sm bg-red-600 text-white hover:bg-red-100 cursor-pointer hover:text-red-600"
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
              'min-w-[28px] rounded-full border h-7 w-7 text-xs cursor-pointer',
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
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div class="flex items-center justify-between border-b border-gray-200 p-6">
          <h2 class="text-xl font-medium text-gray-800">
            {{ isEditingForm ? 'Edit Product Category' : 'New Product Category' }}
          </h2>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="saveCategory" class="space-y-4 p-6">
          <div>
            <label class="mb-1 block text-xs font-semibold text-gray-700">Category Name</label>
            <input
              v-model="form.Category_name"
              type="text"
              required
              placeholder="e.g. tablets"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

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
              {{ saving ? 'Saving...' : 'Submit' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div class="p-6">
          <h2 class="text-lg font-semibold text-gray-800">Delete Product Category</h2>
          <p class="mt-2 text-sm text-gray-500">
            Are you sure you want to delete
            <span class="font-semibold text-gray-700">{{ categoryToDelete?.Category_name }}</span>?
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
            @click="deleteCategory"
            :disabled="deleting"
            class="flex items-center gap-2 rounded-sm bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 cursor-pointer"
          >
            <CircleCheckIcon class="h-4 w-4" />
            {{ deleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
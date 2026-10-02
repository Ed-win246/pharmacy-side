<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import api from '@/lib/api'
import toast from '@tsirosgeorge/toastnotification'
import { Check, Search, X } from 'lucide-vue-next'

// ---------- State ----------
const stockLevels = ref([])
const searchQuery = ref('')
const loading = ref(false)
const activatingId = ref(null)

// Pagination (counts medicines/groups, not individual batches)
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 50, 150, 200]

// ---------- Data fetching ----------
onMounted(fetchStockLevels)

async function fetchStockLevels() {
  loading.value = true
  try {
    const { data } = await api.get('/stock-levels')
    stockLevels.value = data
  } catch (error) {
    console.error('Failed to fetch stock levels', error)
    toast.error('Failed to fetch stock levels')
  } finally {
    loading.value = false
  }
}

async function activateLevel(level) {
  if (level.is_active) return

  activatingId.value = level.id
  try {
    await api.post(`/stock-levels/${level.id}/activate`)
    stockLevels.value = stockLevels.value.map((l) =>
      l.id === level.id ? { ...l, is_active: true } : l
    )
    toast.success(`${level.medicine_name} activated successfully`)
  } catch (error) {
    console.error('Failed to activate stock level', error)
    toast.error('Failed to activate stock level')
  } finally {
    activatingId.value = null
  }
}

// ---------- Expiry date colours ----------
// Parses the date as a LOCAL date, so timezones don't shift the day
function parseDateOnly(value) {
  if (!value) return null
  const text = String(value).trim().split(/[T ]/)[0]

  // YYYY-MM-DD  or  YYYY/MM/DD
  let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (match) return new Date(+match[1], +match[2] - 1, +match[3])

  // DD/MM/YYYY  or  DD-MM-YYYY
  match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (match) return new Date(+match[3], +match[2] - 1, +match[1])

  // Anything else the browser can understand
  const fallback = new Date(value)
  return isNaN(fallback) ? null : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate())
}

function isExpired(value) {
  const date = parseDateOnly(value)
  if (!date) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today // expiring today still counts as not yet expired
}

// Inline styles so the colours show up whatever Tailwind does
function expiryStyle(value) {
  if (!parseDateOnly(value)) return { color: '#9ca3af' } // no / unreadable date: grey

  return isExpired(value)
    ? { backgroundColor: '#fee2e2', color: '#dc2626' } // passed: red
    : { backgroundColor: '#ffedd5', color: '#f97316' } // not yet expired: light orange
}

// ---------- Search ----------
// Every word you type must appear somewhere in the row (name, category, batch, qty, price, expiry)
const filteredStock = computed(() => {
  const words = searchQuery.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return stockLevels.value

  return stockLevels.value.filter((l) => {
    const haystack = [
      l.medicine_name,
      l.category,
      l.batch_number,
      l.quantity,
      l.buying_price,
      l.expiry_date,
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ')

    return words.every((word) => haystack.includes(word))
  })
})

// ---------- Grouping (one row per medicine, batches stacked inside) ----------
const groupedStockLevels = computed(() => {
  const groups = {}

  filteredStock.value.forEach((level) => {
    const key = level.medicine_name || 'unknown'
    if (!groups[key]) {
      groups[key] = {
        medicine_name: level.medicine_name,
        category: level.category,
        batches: [],
      }
    }
    groups[key].batches.push(level)
  })

  return Object.values(groups)
})

// ---------- Pagination (works on the filtered, grouped list) ----------
const totalPages = computed(() => Math.ceil(groupedStockLevels.value.length / pageSize.value) || 1)

const paginatedGroups = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return groupedStockLevels.value.slice(start, start + pageSize.value)
})

const visiblePageNumbers = computed(() =>
  Array.from({ length: totalPages.value }, (_, i) => i + 1)
)

// Go back to page 1 whenever the result set changes
watch([pageSize, searchQuery, () => stockLevels.value.length], () => {
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
    <div class="max-w-7xl mx-auto flex flex-col p-2 pb-10">
      <!-- Header / breadcrumb -->
      <div class="flex items-center justify-between p-4">
        <h2 class="flex items-center gap-2 text-sm font-medium uppercase">Batch Levels</h2>
        <div class="text-sm font-medium">
          <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
          <span class="text-gray-400"> / Batch Levels</span>
        </div>
      </div>

      <!-- Show entries (left) + search (right) -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 text-xs text-gray-600">
          <span>Show</span>
          <select v-model="pageSize" class="w-auto rounded-sm border border-gray-300 px-2 py-1 text-xs">
            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
          </select>
          <span>entries</span>
        </div>

        <div class="relative ml-auto w-full max-w-[200px]">
          <Search class="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search..."
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

      <!-- Table -->
      <div class="mt-4 bg-white shadow-sm rounded-sm">
        <table class="w-full text-left text-xs">
          <thead class="border-b tracking-wide">
            <tr>
              <th class="px-2 py-2 font-semibold">#</th>
              <th class="px-2 py-2 font-semibold">Product</th>
              <th class="px-2 py-2 font-semibold">Batch</th>
              <th class="px-2 py-2 font-semibold">Quantity</th>
              <th class="px-2 py-2 font-semibold">Buy Price</th>
              <th class="px-2 py-2 font-semibold">Expiry Date</th>
              <th class="px-2 py-2 font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading">
              <td class="px-4 py-12 text-center text-gray-400" colspan="7">Loading stock levels...</td>
            </tr>
            <tr v-else-if="!stockLevels.length">
              <td class="px-4 py-12 text-center text-gray-400" colspan="7">
                No stock found. Please register your stock.
              </td>
            </tr>
            <tr v-else-if="groupedStockLevels.length === 0">
              <td class="px-4 py-12 text-center text-gray-500" colspan="7">
                No stock batch matches "{{ searchQuery }}"
              </td>
            </tr>

            <template v-else >
              <tr
                v-for="(group, groupIndex) in paginatedGroups"
                :key="group.medicine_name"
              >
                <td class="px-2 py-3 align-middle font-medium">
                  {{ (currentPage - 1) * pageSize + groupIndex + 1 }}
                </td>

                <td class="px-2 py-3 align-middle text-xs">
                  <div class="text-sm font-medium text-gray-900">{{ group.medicine_name }}</div>
                  <div class="font-medium text-green-500">{{ group.category }}</div>
                </td>

                <td class="px-2 py-3 align-middle font-medium">
                  <div class="flex flex-col gap-2">
                    <div v-for="level in group.batches" :key="level.id" class="flex h-8 items-center">
                      {{ level.batch_number || '—' }}
                    </div>
                  </div>
                </td>

                <td class="px-2 py-3 align-middle font-medium">
                  <div class="flex flex-col gap-2">
                    <div v-for="level in group.batches" :key="level.id" class="flex h-8 items-center">
                      {{ level.quantity }}
                    </div>
                  </div>
                </td>

                <td class="px-2 py-3 align-middle font-medium">
                  <div class="flex flex-col gap-2">
                    <div v-for="level in group.batches" :key="level.id" class="flex h-8 items-center">
                      {{ level.buying_price }}
                    </div>
                  </div>
                </td>

                <!-- Expiry: red = already expired, light orange = not yet expired -->
                <td class="px-2 py-3 align-middle font-medium">
                  <div class="flex flex-col gap-2">
                    <div v-for="level in group.batches" :key="level.id" class="flex h-8 items-center">
                      <span
                        class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                        :style="expiryStyle(level.expiry_date)"
                        :title="
                          !level.expiry_date ? '' : isExpired(level.expiry_date) ? 'Expired' : 'Not yet expired'
                        "
                      >
                        {{ level.expiry_date || '—' }}
                      </span>
                    </div>
                  </div>
                </td>

                <td class="px-2 py-3 align-middle">
                  <div class="flex flex-col gap-2">
                    <div v-for="level in group.batches" :key="level.id" class="flex h-8 items-center">
                      <button
                        @click="activateLevel(level)"
                        :disabled="level.is_active || activatingId === level.id"
                        class="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors"
                        :class="
                          level.is_active
                            ? 'cursor-default bg-green-100 text-green-700'
                            : 'cursor-pointer bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
                        "
                      >
                        <Check v-if="level.is_active" class="h-3.5 w-3.5" />
                        {{ activatingId === level.id ? 'Activating...' : level.is_active ? 'Activated' : 'Activate' }}
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
         <div
        class="flex items-center justify-end bg-white px-4 py-3 text-xs text-gray-600 shadow-sm rounded-sm"
      >
        <!-- <span>
          Showing {{ paginatedGroups.length }} of {{ groupedStockLevels.length }} products
        </span> -->
        <div class="flex items-center gap-2">
          <span>Page {{ currentPage }} of {{ totalPages }}</span>
          <button
            v-for="page in visiblePageNumbers"
            :key="page"
            type="button"
            @click="goToPage(page)"
            :class="[
              'min-w-[28px] rounded-full border h-7 w-7 flex items-center justify-center text-xs',
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

      <!-- Pagination: directly below the table, numbers only -->
    </div>
  </div>
</template>
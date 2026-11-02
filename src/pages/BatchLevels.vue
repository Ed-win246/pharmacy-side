<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import api from '@/lib/api'
import toast from '@tsirosgeorge/toastnotification'
import { Check, Search, X } from 'lucide-vue-next'

// ---------- State ----------
const stockLevels = ref([])
const medicines = ref([])
const units = ref([])
const searchQuery = ref('')
const loading = ref(false)
const activatingId = ref(null)

// Pagination (counts medicines/groups, not individual batches)
const currentPage = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [10, 50, 150, 200]

// ---------- Data fetching ----------
async function load(url, target, label) {
  try {
    const { data } = await api.get(url)
    target.value = data
  } catch (error) {
    console.error(`Failed to load ${label}`, error)
    toast.error(`Failed to load ${label}`)
  }
}

async function fetchStockLevels() {
  loading.value = true
  await load('/stock-levels', stockLevels, 'stock levels')
  loading.value = false
}

onMounted(async () => {
  await Promise.all([
    fetchStockLevels(),
    load('/medicines', medicines, 'products'),
    load('/units', units, 'units'),
  ])
})


// compares names ignoring capitals and extra spaces
const sameName = (a, b) =>
  String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()

async function activateLevel(level) {
  if (level.is_active) return
  if (isExpired(level.expiry_date)) {
    toast.error('Cannot activate this product because it has expired')
    return
  }

  activatingId.value = level.id
  try {
    await api.post(`/stock-levels/${level.id}/activate`)

    // only ONE active batch per product: the others switch off
    stockLevels.value = stockLevels.value.map((l) => {
      if (l.id === level.id) return { ...l, is_active: true }
      if (sameName(l.medicine_name, level.medicine_name)) return { ...l, is_active: false }
      return l
    })
    toast.success(`${level.medicine_name} activated successfully`)
  } catch (error) {
    console.error('Failed to activate stock level', error)
    toast.error(error.response?.data?.message || 'Failed to activate stock level')
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

// ---------- Base quantities ----------
const unitNameById = (id) =>
  units.value.find((u) => Number(u.id) === Number(id))?.unit_name

// the product this batch belongs to
const medicineOf = (level) =>
  medicines.value.find((m) => sameName(m.name, level.medicine_name)) || null

// how many smallest units (tablets) are inside ONE of the unit this batch was received in
function factorOf(level) {
  const med = medicineOf(level)
  if (!med) return 1

  // received in the product's own (smallest) unit: 1 = 1
  if (sameName(level.unit_name, med.unit_name)) return 1

  // received in a bigger unit (Box): the unit row says how many fit inside
  const row = (med.unit_details || []).find((r) =>
    sameName(unitNameById(r.unit_id), level.unit_name)
  )
  return row ? Number(row.quantity) || 1 : 1
}

// the smallest unit's name, e.g. "Tablet"
const baseUnitName = (level) => medicineOf(level)?.unit_name || ''

// RECEIVED BASE = quantity received x factor (50 Box x 10 = 500). Never changes.
function receivedBase(level) {
  const saved = Number(level.received_base_quantity)
  if (saved > 0) return saved                        // saved on the server when stock was added
  return Number(level.quantity) * factorOf(level)    // otherwise worked out here
}

// REMAINING BASE = what the server still has. Every sale reduces this number.
const remainingBase = (level) => Number(level.base_quantity ?? 0)

// ---------- Search ----------
// Every word you type must appear somewhere in the row
const filteredStock = computed(() => {
  const words = searchQuery.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return stockLevels.value

  return stockLevels.value.filter((l) => {
    const haystack = [
      l.medicine_name,
      l.category,
      l.batch_number,
      l.quantity,
      l.unit_name,
      receivedBase(l),
      remainingBase(l),
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
    <div class="flex flex-col p-2 pb-10">
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
      <div class="mt-4 bg-white shadow-sm rounded-sm ">
        <table class="w-full text-center text-xs">
          <thead class="border-b tracking-wide">
            <tr>
              <th class="px-4 py-3 font-semibold">#</th>
              <th class="px-4 py-3 font-semibold">Product</th>
              <th class="px-4 py-3 font-semibold" colspan="7">Batches</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading">
              <td class="px-4 py-12 text-center text-gray-400" colspan="10">Loading stock levels...</td>
            </tr>
            <tr v-else-if="!stockLevels.length">
              <td class="px-4 py-12 text-center text-gray-400" colspan="10">
                No stock found. Please register your stock.
              </td>
            </tr>
            <tr v-else-if="groupedStockLevels.length === 0">
              <td class="px-4 py-12 text-center text-gray-500" colspan="10">
                No stock batch matches "{{ searchQuery }}"
              </td>
            </tr>

            <template v-for="(group, groupIndex) in paginatedGroups" :key="group.medicine_name">
              <tr class="border-t border-gray-200">
                <td :rowspan="group.batches.length + 1" class="px-2 py-3 align-middle font-medium">
                  {{ (currentPage - 1) * pageSize + groupIndex + 1 }}
                </td>
                <td :rowspan="group.batches.length + 1" class="px-2 py-3 align-middle">
                  <div class="text-sm font-medium text-gray-900">{{ group.medicine_name }}</div>
                  <div class="font-medium text-green-500">{{ group.category }}</div>
                </td>
                <th class="px-2 py-2 font-semibold"><div class="subheader">Batch</div></th>
                <!-- <th class="px-2 py-2 font-semibold"><div class="subheader">Received Quantity</div></th> -->
                <th class="px-2 py-2 font-semibold whitespace-nowrap"><div class="subheader">Received Unit</div></th>
                <th class="px-2 py-2 font-semibold"><div class="subheader">Received Base</div></th>
                <th class="px-2 py-2 font-semibold"><div class="subheader">Remaining Base</div></th>
                <th class="px-2 py-2 font-semibold"><div class="subheader">Buy Price</div></th>
                <th class="px-2 py-2 font-semibold"><div class="subheader">Expiry Date</div></th>
                <th class="px-2 py-2 font-semibold"><div class="subheader">Actions</div></th>
              </tr>

              <tr v-for="level in group.batches" :key="level.id" class="border-b border-gray-200">
                <td class="px-2 py-2 align-middle font-medium">{{ level.batch_number || '—' }}</td>
                <!-- <td class="px-2 py-3 align-middle font-medium">{{ level.quantity }}</td> -->
                <td class="px-2 py-2 align-middle font-medium">{{ level.unit_name || '—' }}</td>
                <td class="px-2 py-2 align-middle font-medium">
                  {{ receivedBase(level) }}
                  <span v-if="baseUnitName(level)" class="ml-1 text-gray-500">{{ baseUnitName(level) }}</span>
                </td>
                <td class="px-2 py-2 align-middle font-medium">
                  <span :class="remainingBase(level) < 1 ? 'text-red-600' : 'text-green-700'">
                    {{ remainingBase(level) }}
                  </span>
                  <span v-if="baseUnitName(level)" class="ml-1 text-gray-500">{{ baseUnitName(level) }}</span>
                </td>
                <td class="px-2 py-2 align-middle font-medium">{{ level.buying_price }}</td>
                <td class="px-2 py-2 align-middle font-medium">
                  <span
                    class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                    :style="expiryStyle(level.expiry_date)"
                    :title="!level.expiry_date ? '' : isExpired(level.expiry_date) ? 'Expired' : 'Not yet expired'"
                  >
                    {{ level.expiry_date || '—' }}
                  </span>
                </td>
                <td class="px-2 py-3 align-middle">
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
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <div class="flex items-center justify-end bg-white px-4 py-3 text-xs text-gray-600 shadow-sm rounded-sm">
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
    </div>
  </div>
</template>
<style scoped>
.subheader {
  background-color: #000;
  color: #fff;
  border-radius: 8px;
  padding: 0.25rem 0.75rem;
  font-size: 12px;
  text-align: center;
}
</style>
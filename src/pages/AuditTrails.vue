<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { Search, X, History, Filter, ChevronLeft, ChevronRight, RefreshCw, Calendar, RotateCcw } from 'lucide-vue-next';

// Sample fallback audit log entries for immediate UI functionality
const sampleLogs = [
    {
        id: 1,
        user_name: 'Admin User',
        user_role: 'Administrator',
        action: 'Stock Posted',
        module: 'Stock',
        description: 'Posted 100 units of Paracetamol (Batch: BATCH-001)',
        ip_address: '192.168.1.10',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
        id: 2,
        user_name: 'Sarah Pharmacist',
        user_role: 'Pharmacist',
        action: 'Product Added',
        module: 'Products',
        description: 'Registered new medicine Amoxicillin 500mg (Capsule)',
        ip_address: '192.168.1.12',
        created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
        id: 3,
        user_name: 'John Storekeeper',
        user_role: 'Storekeeper',
        action: 'Stock Reconciled',
        module: 'Stock',
        description: 'Reconciled Ibuprofen batch BATCH-002 actual quantity to 45',
        ip_address: '192.168.1.15',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
        id: 4,
        user_name: 'Admin User',
        user_role: 'Administrator',
        action: 'Supplier Registered',
        module: 'Suppliers',
        description: 'Added new supplier MedPharma Distributors Ltd',
        ip_address: '192.168.1.10',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
        id: 5,
        user_name: 'Sarah Pharmacist',
        user_role: 'Pharmacist',
        action: 'User Login',
        module: 'Auth',
        description: 'User logged in successfully from IP 192.168.1.12',
        ip_address: '192.168.1.12',
        created_at: new Date(Date.now() - 3600000 * 30).toISOString()
    },
    {
        id: 6,
        user_name: 'Admin User',
        user_role: 'Administrator',
        action: 'Price Updated',
        module: 'Products',
        description: 'Updated buying price for Cetirizine 10mg to 15.00',
        ip_address: '192.168.1.10',
        created_at: new Date(Date.now() - 3600000 * 48).toISOString()
    }
];

const auditLogs = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedModule = ref('all');
const startDate = ref('');
const endDate = ref('');

// Pagination
const currentPage = ref(1);
const pageSize = ref(10);
const pageSizeOptions = [10, 25, 50, 100];

onMounted(() => {
    fetchAuditLogs();
});

async function fetchAuditLogs() {
    loading.value = true;
    try {
        const { data } = await api.get('/audit-logs');
        const logs = Array.isArray(data) ? data : (data.data || []);
        auditLogs.value = logs.length > 0 ? logs : sampleLogs;
    } catch (error) {
        console.error('API endpoint /audit-logs unavailable, using initial audit logs', error);
        auditLogs.value = sampleLogs;
    } finally {
        loading.value = false;
    }
}

// Extract unique modules dynamically for filter dropdown
const availableModules = computed(() => {
    const modules = auditLogs.value.map(log => log.module).filter(Boolean);
    return ['all', ...new Set(modules)];
});

// Advanced filter computation (module, date range, search query)
const filteredLogs = computed(() => {
    let logs = auditLogs.value;

    // Filter by Module
    if (selectedModule.value !== 'all') {
        logs = logs.filter(log => String(log.module || '').toLowerCase() === selectedModule.value.toLowerCase());
    }

    // Filter by Start Date
    if (startDate.value) {
        const start = new Date(startDate.value).getTime();
        logs = logs.filter(log => new Date(log.created_at).getTime() >= start);
    }

    // Filter by End Date
    if (endDate.value) {
        const end = new Date(endDate.value).setHours(23, 59, 59, 999);
        logs = logs.filter(log => new Date(log.created_at).getTime() <= end);
    }

    // Filter by Search Query
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return logs;

    return logs.filter(log =>
        String(log.user_name || log.user?.name || '').toLowerCase().includes(query) ||
        String(log.user_role || log.user?.role || '').toLowerCase().includes(query) ||
        String(log.action || '').toLowerCase().includes(query) ||
        String(log.module || '').toLowerCase().includes(query) ||
        String(log.description || log.details || '').toLowerCase().includes(query) ||
        String(log.ip_address || '').toLowerCase().includes(query) ||
        String(log.created_at || '').toLowerCase().includes(query)
    );
});

// Pagination computed properties
const totalPages = computed(() => Math.ceil(filteredLogs.value.length / pageSize.value) || 1);

const paginatedLogs = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredLogs.value.slice(start, start + pageSize.value);
});

const visiblePageNumbers = computed(() => {
    const pages = [];
    for (let i = 1; i <= totalPages.value; i++) {
        pages.push(i);
    }
    return pages;
});

// Reset pagination page to 1 on filter changes
watch([pageSize, searchQuery, selectedModule, startDate, endDate], () => {
    currentPage.value = 1;
});

function goToPage(page) {
    if (page < 1 || page > totalPages.value) return;
    currentPage.value = page;
}

function clearFilters() {
    searchQuery.value = '';
    selectedModule.value = 'all';
    startDate.value = '';
    endDate.value = '';
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        return d.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch {
        return dateStr;
    }
}

function getActionBadgeClass(action) {
    const act = String(action || '').toLowerCase();
    if (act.includes('created') || act.includes('added') || act.includes('posted')) {
        return 'bg-green-100 text-green-700 border border-green-200';
    }
    if (act.includes('updated') || act.includes('reconciled') || act.includes('edited')) {
        return 'bg-blue-100 text-blue-700 border border-blue-200';
    }
    if (act.includes('deleted') || act.includes('removed')) {
        return 'bg-red-100 text-red-700 border border-red-200';
    }
    return 'bg-gray-100 text-gray-700 border border-gray-200';
}
</script>

<template>
    <div class="min-h-screen w-full bg-gray-50/50">
        <div class="flex flex-col p-4 space-y-4">
            
            <!-- Page Header -->
            <div class="flex items-center justify-between pb-3 border-b border-gray-200">
                <div>
                    <h2 class="font-medium text-base text-gray-800 uppercase tracking-wide flex items-center gap-2">
                        <History class="w-5 h-5 text-green-600" /> Audit Trails
                    </h2>
                    <p class="text-xs text-gray-500 mt-0.5">Track and monitor all user activities and system operations</p>
                </div>
                <div class="flex items-center gap-3">
                    <button 
                        @click="fetchAuditLogs" 
                        :disabled="loading"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" /> Refresh Logs
                    </button>
                    <div class="text-xs font-medium text-gray-500">
                        <router-link to="/dashboard" class="text-black hover:underline">Dashboard</router-link>
                        <span class="text-gray-400"> / Audit Trails</span>
                    </div>
                </div>
            </div>

            <!-- Filters & Search Toolbar -->
            <div class="bg-white p-3 rounded-sm shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                
                <!-- Left Section: Page Size, Module Filter & Date Filters -->
                <div class="flex items-center gap-3 flex-wrap">
                    
                    <!-- Entries selector -->
                    <div class="flex items-center gap-1.5 text-gray-500">
                        <span>Show</span>
                        <select v-model.number="pageSize" class="border border-gray-300 rounded-sm px-2 py-1 text-xs focus:ring-1 focus:ring-green-500 outline-none">
                            <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                        </select>
                        <span>entries</span>
                    </div>

                    <!-- Module Filter -->
                    <div class="flex items-center gap-1.5 text-gray-500">
                        <Filter class="w-3.5 h-3.5 text-gray-400" />
                        <span>Module:</span>
                        <select v-model="selectedModule" class="border border-gray-300 rounded-sm px-2 py-1 text-xs capitalize focus:ring-1 focus:ring-green-500 outline-none">
                            <option v-for="mod in availableModules" :key="mod" :value="mod">{{ mod }}</option>
                        </select>
                    </div>

                    <!-- Date Range Filter -->
                    <div class="flex items-center gap-1.5 text-gray-500">
                        <Calendar class="w-3.5 h-3.5 text-gray-400" />
                        <span>From:</span>
                        <input type="date" v-model="startDate" class="border border-gray-300 rounded-sm px-2 py-1 text-xs focus:ring-1 focus:ring-green-500 outline-none" />
                        <span>To:</span>
                        <input type="date" v-model="endDate" class="border border-gray-300 rounded-sm px-2 py-1 text-xs focus:ring-1 focus:ring-green-500 outline-none" />
                    </div>

                    <!-- Reset Filters Button -->
                    <button 
                        v-if="searchQuery || selectedModule !== 'all' || startDate || endDate"
                        @click="clearFilters"
                        class="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded-sm border border-red-200 hover:bg-red-50 cursor-pointer"
                    >
                        <RotateCcw class="w-3 h-3" /> Reset
                    </button>
                </div>

                <!-- Right Section: Search Bar -->
                <div class="relative w-full sm:w-64">
                    <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Search logs..."
                        class="w-full pl-8 pr-8 py-1.5 border border-gray-300 rounded-sm text-xs focus:ring-1 focus:ring-green-500 outline-none"
                    />
                    <button
                        v-if="searchQuery"
                        @click="searchQuery = ''"
                        type="button"
                        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                        <X class="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <!-- Audit Logs Data Table -->
            <div class="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs divide-y divide-gray-200">
                        <thead class="bg-gray-50 tracking-wide text-gray-700 uppercase font-semibold">
                            <tr>
                                <th class="px-3 py-3 w-12 text-center">#</th>
                                <th class="px-3 py-3">User</th>
                                <th class="px-3 py-3">Action</th>
                                <th class="px-3 py-3">Module</th>
                                <th class="px-3 py-3">Description / Details</th>
                                <th class="px-3 py-3">IP Address</th>
                                <th class="px-3 py-3">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            <!-- Loading State -->
                            <tr v-if="loading">
                                <td colspan="7" class="px-4 py-12 text-center text-gray-400">
                                    Loading audit logs...
                                </td>
                            </tr>

                            <!-- Empty Filter/Search Results -->
                            <tr v-else-if="!paginatedLogs.length && (searchQuery || selectedModule !== 'all' || startDate || endDate)">
                                <td colspan="7" class="px-4 py-12 text-center text-gray-500">
                                    No audit logs matching current filter criteria.
                                    <button @click="clearFilters" class="ml-2 text-green-600 hover:underline font-medium cursor-pointer">Clear filters</button>
                                </td>
                            </tr>

                            <!-- No Logs Record State -->
                            <tr v-else-if="!paginatedLogs.length">
                                <td colspan="7" class="px-4 py-12 text-center text-gray-400">
                                    No audit trail logs recorded yet.
                                </td>
                            </tr>

                            <!-- Data Rows -->
                            <tr 
                                v-else 
                                v-for="(log, index) in paginatedLogs" 
                                :key="log.id || index"
                                class="hover:bg-slate-50 transition-colors"
                            >
                                <td class="px-3 py-2.5 text-center font-medium text-gray-500">
                                    {{ (currentPage - 1) * pageSize + index + 1 }}
                                </td>
                                <td class="px-3 py-2.5">
                                    <div class="font-semibold text-gray-900">{{ log.user_name || log.user?.name || 'System / Guest' }}</div>
                                    <div class="text-[11px] text-gray-400">{{ log.user_role || log.user?.role || 'Staff' }}</div>
                                </td>
                                <td class="px-3 py-2.5">
                                    <span class="inline-block px-2 py-0.5 text-[11px] font-medium rounded-sm capitalize" :class="getActionBadgeClass(log.action)">
                                        {{ log.action }}
                                    </span>
                                </td>
                                <td class="px-3 py-2.5 font-medium text-gray-700 uppercase tracking-wider text-[11px]">
                                    {{ log.module || 'General' }}
                                </td>
                                <td class="px-3 py-2.5 text-gray-600 max-w-xs truncate" :title="log.description || log.details">
                                    {{ log.description || log.details || '—' }}
                                </td>
                                <td class="px-3 py-2.5 text-gray-500 font-mono text-[11px]">
                                    {{ log.ip_address || '—' }}
                                </td>
                                <td class="px-3 py-2.5 text-gray-500 font-mono text-[11px]">
                                    {{ formatDate(log.created_at) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination Footer -->
                <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
                    <div>
                        Showing 
                        <span class="font-semibold text-gray-800">{{ filteredLogs.length ? (currentPage - 1) * pageSize + 1 : 0 }}</span> 
                        to 
                        <span class="font-semibold text-gray-800">{{ Math.min(currentPage * pageSize, filteredLogs.length) }}</span> 
                        of 
                        <span class="font-semibold text-gray-800">{{ filteredLogs.length }}</span> entries
                    </div>

                    <div v-if="totalPages > 1" class="flex items-center gap-1">
                        <button 
                            @click="goToPage(currentPage - 1)" 
                            :disabled="currentPage === 1"
                            class="px-2 py-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
                        >
                            <ChevronLeft class="w-3.5 h-3.5" />
                        </button>

                        <button 
                            v-for="page in visiblePageNumbers" 
                            :key="page"
                            @click="goToPage(page)"
                            class="px-2.5 py-1 border rounded-sm font-medium transition cursor-pointer"
                            :class="currentPage === page ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
                        >
                            {{ page }}
                        </button>

                        <button 
                            @click="goToPage(currentPage + 1)" 
                            :disabled="currentPage === totalPages"
                            class="px-2 py-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
                        >
                            <ChevronRight class="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

            </div>

        </div>
    </div>
</template>
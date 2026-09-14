<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
    LayoutDashboard, 
    Package, 
    Settings, 
    ChevronDown, 
    Tag, 
    Ruler, 
    Pill, 
    FolderArchive,
    PlusCircle,
    ShoppingCart,
    Layers,
    Database,
    GitCompare,
    Eye,
    Truck,
    AlertTriangle,
    BarChart3,
    LogOut
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const user = ref(null);

const medicineMenuOpen = ref(false);
const inventoryMenuOpen = ref(false);

const menuItem = [
    { name: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
];

const medicinesubItems = [
    { name: 'Products', icon: Package, route: '/products' },
    { name: 'Categories', icon: Tag, route: '/categories' },
    { name: 'Units', icon: Ruler, route: '/units' },
];

const inventoryItems = [
    { name: 'Add Stock', icon: PlusCircle, route: '/addstock' },
    { name: 'Purchases', icon: ShoppingCart, route: '/purchases' },
    { name: 'Batch Levels', icon: Layers, route: '/stocklevels' },
    { name: 'System Stock', icon: Database, route: '/systemstock' },
    { name: 'Reconcile Stock', icon: GitCompare, route: '/reconcilestock' },
    { name: 'View Stock', icon: Eye, route: '/viewstock' },
    { name: 'System Suppliers', icon: Truck, route: '/suppliers' },
    { name: 'Expired Stock', icon: AlertTriangle, route: '/expiredstock' }
];

const othermenuItems = [
    { name: 'Reports', icon: BarChart3, route: '/reports' },
    { name: 'System Settings', icon: Settings, route: '/settings' },
];

const isMedicineActive = computed(() => {
    return medicinesubItems.some(item => route.path === item.route);
});

const isInventoryActive = computed(() => {
    return inventoryItems.some(item => route.path === item.route);
});

// Auto-expand menu if active route is inside it
onMounted(() => {
    if (isMedicineActive.value) medicineMenuOpen.value = true;
    if (isInventoryActive.value) inventoryMenuOpen.value = true;
});

watch(() => route.path, (newPath) => {
    if (medicinesubItems.some(item => item.route === newPath)) {
        medicineMenuOpen.value = true;
    }
    if (inventoryItems.some(item => item.route === newPath)) {
        inventoryMenuOpen.value = true;
    }
});

function toggleMedicineMenu() {
    medicineMenuOpen.value = !medicineMenuOpen.value;
}

function toggleinventoryMenu() {
    inventoryMenuOpen.value = !inventoryMenuOpen.value;
}

try {
    user.value = JSON.parse(localStorage.getItem('user') || 'null');
} catch {
    user.value = null;
}

function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    router.push('/login');
}
</script>

<template>
    <aside class="flex h-screen max-h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white shadow-sm select-none">
        <!-- Header -->
        <div class="p-6 border-b border-gray-100 flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                P
            </div>
            <div>
                <h1 class="text-xl font-bold text-green-600 leading-tight">Pharmacy Portal</h1>
                <p class="text-xs font-medium text-gray-400">Management System</p>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-4">
            <!-- Main Items -->
            <router-link
                v-for="item in menuItem"
                :key="item.name"
                :to="item.route"
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-green-600 transition-colors duration-200"
                active-class="bg-green-50 text-green-600 font-semibold"
            >
                <component :is="item.icon" class="w-4 h-4 shrink-0" />
                <span>{{ item.name }}</span>
            </router-link>

            <!-- Medicine Dropdown -->
            <div class="space-y-1">
                <button
                    @click="toggleMedicineMenu"
                    type="button"
                    class="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 group"
                    :class="[
                        isMedicineActive ? 'bg-green-50/70 text-green-600 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-green-600'
                    ]"
                >
                    <span class="flex items-center gap-3">
                        <Pill class="w-4 h-4 shrink-0" :class="{ 'text-green-600': isMedicineActive }" />
                        <span>Medicine</span>
                    </span>
                    <ChevronDown
                        class="w-4 h-4 shrink-0 text-gray-400 group-hover:text-green-600 transition-transform duration-300 ease-in-out"
                        :class="{ 'rotate-180 text-green-600': medicineMenuOpen }"
                    />
                </button>

                <Transition
                    enter-active-class="transition-all duration-300 ease-in-out overflow-hidden"
                    leave-active-class="transition-all duration-300 ease-in-out overflow-hidden"
                    enter-from-class="opacity-0 max-h-0"
                    enter-to-class="opacity-100 max-h-[500px]"
                    leave-from-class="opacity-100 max-h-[500px]"
                    leave-to-class="opacity-0 max-h-0"
                >
                    <div v-show="medicineMenuOpen" class="pl-4 pr-1 py-1 space-y-1 border-l-2 border-green-100 ml-5 mt-1">
                        <router-link
                            v-for="item in medicinesubItems"
                            :key="item.name"
                            :to="item.route"
                            class="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-green-600 transition-colors duration-200"
                            active-class="bg-green-50 text-green-600 font-semibold"
                        >
                            <component :is="item.icon" class="w-3.5 h-3.5 shrink-0" />
                            <span>{{ item.name }}</span>
                        </router-link>
                    </div>
                </Transition>
            </div>

            <!-- Inventory Dropdown -->
            <div class="space-y-1">
                <button
                    @click="toggleinventoryMenu"
                    type="button"
                    class="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 group"
                    :class="[
                        isInventoryActive ? 'bg-green-50/70 text-green-600 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-green-600'
                    ]"
                >
                    <span class="flex items-center gap-3">
                        <FolderArchive class="w-4 h-4 shrink-0" :class="{ 'text-green-600': isInventoryActive }" />
                        <span>Inventory</span>
                    </span>
                    <ChevronDown
                        class="w-4 h-4 shrink-0 text-gray-400 group-hover:text-green-600 transition-transform duration-300 ease-in-out"
                        :class="{ 'rotate-180 text-green-600': inventoryMenuOpen }"
                    />
                </button>

                <Transition
                    enter-active-class="transition-all duration-300 ease-in-out overflow-hidden"
                    leave-active-class="transition-all duration-300 ease-in-out overflow-hidden"
                    enter-from-class="opacity-0 max-h-0"
                    enter-to-class="opacity-100 max-h-[500px]"
                    leave-from-class="opacity-100 max-h-[500px]"
                    leave-to-class="opacity-0 max-h-0"
                >
                    <div v-show="inventoryMenuOpen" class="pl-4 pr-1 py-1 space-y-1 border-l-2 border-green-100 ml-5 mt-1">
                        <router-link
                            v-for="item in inventoryItems"
                            :key="item.name"
                            :to="item.route"
                            class="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-green-600 transition-colors duration-200"
                            active-class="bg-green-50 text-green-600 font-semibold"
                        >
                            <component :is="item.icon" class="w-3.5 h-3.5 shrink-0" />
                            <span>{{ item.name }}</span>
                        </router-link>
                    </div>
                </Transition>
            </div>

            <!-- Other Menu Items -->
            <router-link
                v-for="item in othermenuItems"
                :key="item.name"
                :to="item.route"
                class="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-green-600 transition-colors duration-200"
                active-class="bg-green-50 text-green-600 font-semibold"
            >
                <component :is="item.icon" class="w-4 h-4 shrink-0" />
                <span>{{ item.name }}</span>
            </router-link>
        </nav>

        <!-- Footer / Logout -->
        <div class="p-4 border-t border-gray-200 flex items-center justify-between">
            <div v-if="user" class="min-w-0 pr-2">
                <p class="truncate text-xs font-semibold text-gray-800">
                    {{ user.name || user.email || 'User' }}
                </p>
                <p class="truncate text-[10px] text-gray-500">
                    {{ user.role || 'Staff' }}
                </p>
            </div>
            <button
                @click="logout"
                type="button"
                class="inline-flex items-center gap-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 shrink-0"
                title="Log out"
            >
                <LogOut class="w-3.5 h-3.5" />
                Logout
            </button>
        </div>
    </aside>
</template>
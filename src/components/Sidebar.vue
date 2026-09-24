<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { LayoutDashboard, Package, Settings, ChevronDown,Tag, Ruler, Pill, FolderArchive,PlusCircle,ShoppingCart,Layers,Database,GitCompare,Eye,Truck,AlertTriangle,BarChart3,LogOut,X, Wallet, Folder} from 'lucide-vue-next';

const props = defineProps({
    isOpen: {
        type: Boolean,
        default: false
    },
    isCollapsed: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['close', 'toggleCollapse']);

const route = useRoute();
const router = useRouter();
const user = ref(null);

const medicineMenuOpen = ref(false);
const inventoryMenuOpen = ref(false);
const settingsMenuOpen=ref(false);
const expensesMenuOpen=ref(false);
const salesMenuOpen=ref(false);

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
const settingsItems=[
    {name:'System Users', route:'/users'},
    {name:'System Roles', route:'/roles'},
    {name:'Permissions', route:'/permissions'},
    {name:'Audit Trails', route:'/audits'},
    {name:'Facility Profile', route:'/facilityprofile'},
    {name:'Facility Settings', route:'/facilitysettings'},
    {name:'Payment Options', route:'/paymentoptions'}
];

const expensesItems=[
    {name:'Add an Expense', route:'/addexpense'},
    {name:'Expenses', route:'/expenses'},
    {name:'Categories',route:'/categoryexpenses'},
    {name:'Expense Items', route:'/expenseitems'}
];

const salesItems=[
    {name:'Add a sale',route:'/sellproduct'},
    {name:'View Sale', route:'/viewsales'},
    {name:'Customers', route:'/customers'}
];


const isMedicineActive = computed(() => {
    return medicinesubItems.some(item => route.path === item.route);
});
const isInventoryActive = computed(() => {
    return inventoryItems.some(item => route.path === item.route);
});
const isSettingsActive=computed(()=>{
    return settingsItems.some(item =>route.path === item.route);
 });
const isExpenseActive= computed(()=>{
    return expensesItems.some(item => route.path === item.route);
 });
 const isSalesActive=computed(()=>{
    return salesItems.some(item=>route.path === item.route);
 });




onMounted(() => {
    if (isMedicineActive.value) medicineMenuOpen.value = true;
    if (isInventoryActive.value) inventoryMenuOpen.value = true;
    if(isSettingsActive.value) settingsMenuOpen.value=true;
    if(isExpenseActive.value) expensesMenuOpen.value=true;
    if(isSalesActive.value) salesMenuOpen.value=true;
});




watch(() => route.path, (newPath) => {
    if (medicinesubItems.some(item => item.route === newPath)) {
        medicineMenuOpen.value = true;
    }
    if (inventoryItems.some(item => item.route === newPath)) {
        inventoryMenuOpen.value = true;
    }
    if(settingsItems.some(item=>item.route === newPath)){
        settingsMenuOpen.value=true;
    }
    if(expensesItems.some(item=>item.route === newPath)){
        expensesMenuOpen.value=true;
    }
    if(salesItems.some(item=>item.route === newPath)){
        salesMenuOpen.value=true;
    }
});




function toggleMedicineMenu() {
    if (props.isCollapsed) {
        emit('toggleCollapse');
        medicineMenuOpen.value = true;
    } else {
        medicineMenuOpen.value = !medicineMenuOpen.value;
    }
}
function toggleinventoryMenu() {
    if (props.isCollapsed) {
        emit('toggleCollapse');
        inventoryMenuOpen.value = true;
    } else {
        inventoryMenuOpen.value = !inventoryMenuOpen.value;
    }
}
function togglesettingsMenu(){
    if(props.isCollapsed){
        emit('toggleCollapse');
        settingsMenuOpen.value=true;
    }else{
        settingsMenuOpen.value = !settingsMenuOpen.value;
    }
}
function toggleexpensesMenu(){
    if(props.isCollapsed){
        emit('toggleCollapse');
        expensesMenuOpen.value = true;
    }else{
        expensesMenuOpen.value = !expensesMenuOpen.value;
    }
}
function togglesalesMenu(){
    if(props.isCollapsed){
        emit('toggleCollapse');
    }else{
        salesMenuOpen.value = !salesMenuOpen.value;
    }
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
    <aside 
        :class="[
            isOpen ? 'translate-x-0' : '-translate-x-full',
            isCollapsed ? 'lg:w-20' : 'lg:w-64',
            'fixed inset-y-0 left-0 z-50 flex h-screen max-h-screen shrink-0 flex-col overflow-hidden border-r border-green-800/60 bg-green-900 text-emerald-100 shadow-xl transition-all duration-300 ease-in-out lg:static lg:translate-x-0 lg:shadow-xs select-none'
        ]"
    >
        <!-- Header -->
        <div class="p-4 border-b border-green-800/60 flex items-center justify-between" :class="{ 'justify-center': isCollapsed }">
            <div class="flex items-center gap-3 min-w-0" v-if="!isCollapsed">
                <div class="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                    P
                </div>
                <div class="min-w-0">
                    <h1 class="text-lg font-bold text-white leading-tight truncate">Pharmacy Portal</h1>
                    <p class="text-xs font-medium text-emerald-300/80 truncate">Management System</p>
                </div>
            </div>
            <div v-else class="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                P
            </div>

            <div>
                <!-- Mobile Close Button -->
                <button
                    @click="emit('close')"
                    type="button"
                    class="p-1.5 text-emerald-300 hover:bg-green-800 hover:text-white rounded-lg lg:hidden cursor-pointer transition-colors"
                >
                    <X class="w-5 h-5" />
                </button>
            </div>
        </div>

        <nav class="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
            <!-- Dashboard Link -->
            <router-link
                v-for="item in menuItem"
                :key="item.name"
                :to="item.route"
                class="flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium text-emerald-100 hover:bg-green-800/80 hover:text-white transition-colors duration-200"
                :class="[
                    isCollapsed ? 'justify-center px-2' : 'px-3.5'
                ]"
                active-class="bg-emerald-600 text-white font-semibold shadow-xs"
                :title="isCollapsed ? item.name : ''"
            >
                <component :is="item.icon" class="w-5 h-5 shrink-0 text-emerald-300" />
                <span v-if="!isCollapsed" class="truncate">{{ item.name }}</span>
            </router-link>
            <!-- sales dropdrown-->
            <div class="space-y-1">
                <button
                @click="togglesalesMenu"
                type="button"
                class="w-full flex items-center justify-between gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-800 group"
                :class="[
                    isCollapsed ? 'justify-between px-2 ': 'px-3.5',
                    isSalesActive ? 'bg-green-800/90 text-white font-semibold': 'text-emarld-100 hover:bg-green-800/80 hover:text-white'
                ]"
                :title="isCollapsed? 'Sales': ''">
                <span class="flex items-center gap-3 min-w-0" :class="{'justify-center': isCollapsed}">
                    <Folder class="w-5 h-5 shrink-0 text-emerald-300"/>
                    <span v-if="!isCollapsed" class="truncate">Sales</span>
                </span>
                <ChevronDown
                v-if="!isCollapsed"
                class="w-4 h-4 shrink-0 text-emerald-300/80 group-hover:text-white transition-transform duration-800 ease-in-out"
                :class="{'rotate-180 text-white':salesMenuOpen}"/>
                </button>
                <Transition
                    enter-active-class="transition-all duration-300 ease-in-out overflow-hidden"
                    leave-active-class="transition-all duration-300 ease-in-out overflow-hidden"
                    enter-from-class="opacity-0 max-h-0"
                    enter-to-class="opacity-100 max-h-[500px]"
                    leave-from-class="opacity-100 max-h-[500px]"
                    leave-to-class="opacity-0 max-h-0"
                >
                    <div 
                        v-show="salesMenuOpen" 
                        :class="[
                            isCollapsed ? 'space-y-1 py-1' : 'pl-4 pr-1 py-1 space-y-1 border-l-2 border-emerald-700/60 ml-5 mt-1'
                        ]"
                    >
                        <router-link
                            v-for="item in salesItems"
                            :key="item.name"
                            :to="item.route"
                            class="flex items-center gap-2.5 py-2 rounded-md text-xs font-medium text-emerald-200/90 hover:bg-green-800/60 hover:text-white transition-colors duration-200"
                            :class="[
                                isCollapsed ? 'justify-center px-2' : 'px-3'
                            ]"
                            active-class="bg-emerald-600 text-white font-semibold shadow-xs"
                            :title="isCollapsed ? item.name : ''"
                        >
                            <component :is="item.icon" class="w-4 h-4 shrink-0 text-emerald-300" />
                            <span v-if="!isCollapsed" class="truncate">{{ item.name }}</span>
                        </router-link>
                    </div>
                </Transition>
            </div>

            <!-- Medicine Dropdown -->
            <div class="space-y-1">
                <button
                    @click="toggleMedicineMenu"
                    type="button"
                    class="w-full flex items-center justify-between gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 group"
                    :class="[
                        isCollapsed ? 'justify-center px-2' : 'px-3.5',
                        isMedicineActive ? 'bg-green-800/90 text-white font-semibold' : 'text-emerald-100 hover:bg-green-800/80 hover:text-white'
                    ]"
                    :title="isCollapsed ? 'Medicine' : ''"
                >
                    <span class="flex items-center gap-3 min-w-0" :class="{ 'justify-center': isCollapsed }">
                        <Pill class="w-5 h-5 shrink-0 text-emerald-300" />
                        <span v-if="!isCollapsed" class="truncate">Medicine</span>
                    </span>
                    <ChevronDown
                        v-if="!isCollapsed"
                        class="w-4 h-4 shrink-0 text-emerald-300/80 group-hover:text-white transition-transform duration-300 ease-in-out"
                        :class="{ 'rotate-180 text-white': medicineMenuOpen }"
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
                    <div 
                        v-show="medicineMenuOpen" 
                        :class="[
                            isCollapsed ? 'space-y-1 py-1' : 'pl-4 pr-1 py-1 space-y-1 border-l-2 border-emerald-700/60 ml-5 mt-1'
                        ]"
                    >
                        <router-link
                            v-for="item in medicinesubItems"
                            :key="item.name"
                            :to="item.route"
                            class="flex items-center gap-2.5 py-2 rounded-md text-xs font-medium text-emerald-200/90 hover:bg-green-800/60 hover:text-white transition-colors duration-200"
                            :class="[
                                isCollapsed ? 'justify-center px-2' : 'px-3'
                            ]"
                            active-class="bg-emerald-600 text-white font-semibold shadow-xs"
                            :title="isCollapsed ? item.name : ''"
                        >
                            <component :is="item.icon" class="w-4 h-4 shrink-0 text-emerald-300" />
                            <span v-if="!isCollapsed" class="truncate">{{ item.name }}</span>
                        </router-link>
                    </div>
                </Transition>
            </div>

            <!-- Inventory Dropdown -->
            <div class="space-y-1">
                <button
                    @click="toggleinventoryMenu"
                    type="button"
                    class="w-full flex items-center justify-between gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 group"
                    :class="[
                        isCollapsed ? 'justify-center px-2' : 'px-3.5',
                        isInventoryActive ? 'bg-green-800/90 text-white font-semibold' : 'text-emerald-100 hover:bg-green-800/80 hover:text-white'
                    ]"
                    :title="isCollapsed ? 'Inventory' : ''"
                >
                    <span class="flex items-center gap-3 min-w-0" :class="{ 'justify-center': isCollapsed }">
                        <FolderArchive class="w-5 h-5 shrink-0 text-emerald-300" />
                        <span v-if="!isCollapsed" class="truncate">Inventory</span>
                    </span>
                    <ChevronDown
                        v-if="!isCollapsed"
                        class="w-4 h-4 shrink-0 text-emerald-300/80 group-hover:text-white transition-transform duration-300 ease-in-out"
                        :class="{ 'rotate-180 text-white': inventoryMenuOpen }"
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
                    <div 
                        v-show="inventoryMenuOpen" 
                        :class="[
                            isCollapsed ? 'space-y-1 py-1' : 'pl-4 pr-1 py-1 space-y-1 border-l-2 border-emerald-700/60 ml-5 mt-1'
                        ]"
                    >
                        <router-link
                            v-for="item in inventoryItems"
                            :key="item.name"
                            :to="item.route"
                            class="flex items-center gap-2.5 py-2 rounded-md text-xs font-medium text-emerald-200/90 hover:bg-green-800/60 hover:text-white transition-colors duration-200"
                            :class="[
                                isCollapsed ? 'justify-center px-2' : 'px-3'
                            ]"
                            active-class="bg-emerald-600 text-white font-semibold shadow-xs"
                            :title="isCollapsed ? item.name : ''"
                        >
                            <component :is="item.icon" class="w-4 h-4 shrink-0 text-emerald-300" />
                            <span v-if="!isCollapsed" class="truncate">{{ item.name }}</span>
                        </router-link>
                    </div>
                </Transition>
            </div>


            <!-- Expenses Dropdown -->
            <div class="space-y-1">
                <button 
                    @click="toggleexpensesMenu"
                    type="button"
                    class="w-full flex items-center justify-between gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors duration-200 group"
                    :class="[
                        isCollapsed ? 'justify-center px-2' : 'px-3.5',
                        isExpenseActive ? 'bg-green-800/90 text-white font-semibold' : 'text-emerald-100 hover:bg-green-800/80 hover:text-white'
                    ]"
                    :title="isCollapsed ? 'Expenses' : ''"
                >
                    <span class="flex items-center gap-3 min-w-0" :class="{ 'justify-center': isCollapsed }">
                        <Wallet class="w-5 h-5 shrink-0 text-emerald-300" />
                        <span v-if="!isCollapsed" class="truncate">Expenses</span>
                    </span>
                    <ChevronDown 
                        v-if="!isCollapsed"
                        class="w-4 h-4 shrink-0 text-emerald-300/80 group-hover:text-white transition-transform duration-300 ease-in-out"
                        :class="{ 'rotate-180 text-white' : expensesMenuOpen }"
                    />
                </button>
                <div 
                    v-show="expensesMenuOpen"
                    :class="[
                        isCollapsed ? 'space-y-1 py-1' : 'pl-4 pr-1 py-1 space-y-1 border-l-2 border-emerald-700/60 ml-5 mt-1'
                    ]"
                >
                    <router-link
                        v-for="item in expensesItems"
                        :key="item.name"
                        :to="item.route"
                        class="flex items-center gap-2.5 py-2 rounded-md text-xs font-medium text-emerald-200/90 hover:bg-green-800/60 hover:text-white transition-colors duration-200"
                        :class="[
                            isCollapsed ? 'justify-center px-2' : 'px-3'
                        ]"
                        active-class="bg-emerald-600 text-white font-semibold shadow-xs"
                        :title="isCollapsed ? item.name : ''"
                    >
                        <span v-if="!isCollapsed" class="truncate">{{ item.name }}</span>
                    </router-link>
                </div>
            </div>

            <!-- Settings Dropdown -->
            <div class="space-y-1">
                <button
                    @click="togglesettingsMenu"
                    type="button"
                    class="w-full flex items-center justify-between gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors duration-200 group"
                    :class="[
                        isCollapsed ? 'justify-center px-2' : 'px-3.5',
                        isSettingsActive ? 'bg-green-800/90 text-white font-semibold' : 'text-emerald-100 hover:bg-green-800/80 hover:text-white'
                    ]"
                    :title="isCollapsed ? 'Settings' : ''"
                >
                    <span class="flex items-center gap-3 min-w-0" :class="{ 'justify-center': isCollapsed }">
                        <Settings class="w-5 h-5 shrink-0 text-emerald-300" />
                        <span v-if="!isCollapsed" class="truncate">System Settings</span>
                    </span>
                    <ChevronDown
                        v-if="!isCollapsed"
                        class="w-4 h-4 shrink-0 text-emerald-300/80 group-hover:text-white transition-transform duration-300 ease-in-out"
                        :class="{ 'rotate-180 text-white': settingsMenuOpen }"
                    />
                </button>
                <div 
                    v-show="settingsMenuOpen"
                    :class="[
                        isCollapsed ? 'space-y-1 py-1' : 'pl-4 pr-1 py-1 space-y-1 border-l-2 border-emerald-700/60 ml-5 mt-1'
                    ]"
                >
                    <router-link
                        v-for="item in settingsItems"
                        :key="item.name"
                        :to="item.route"
                        class="flex items-center gap-2.5 py-2 rounded-md text-xs font-medium text-emerald-200/90 hover:bg-green-800/60 hover:text-white transition-colors duration-200"
                        :class="[
                            isCollapsed ? 'justify-center px-2' : 'px-3'
                        ]"
                        active-class="bg-emerald-600 text-white font-semibold shadow-xs"
                        :title="isCollapsed ? item.name : ''"
                    >
                        <span v-if="!isCollapsed" class="truncate">{{ item.name }}</span>
                    </router-link>
                </div>
            </div>
        </nav>

        <!-- Footer / Logout -->
        <div class="p-3 border-t border-green-800/60 flex items-center justify-between" :class="{ 'justify-center': isCollapsed }">
            <div v-if="user && !isCollapsed" class="min-w-0 pr-2">
                <p class="truncate text-xs font-semibold text-white">
                    {{ user.name || user.owner_name || user.username || user.full_name || user.email || 'User' }}
                </p>
                <p class="truncate text-[10px] text-emerald-300/80">
                    {{ user.role || 'Staff' }}
                </p>
            </div>
            <button
                @click="logout"
                type="button"
                class="inline-flex items-center gap-1.5 bg-white text-red-200 hover:bg-red-600 hover:text-white border border-red-100 rounded-lg text-xs font-medium transition-colors duration-200 shrink-0 cursor-pointer"
                :class="[
                    isCollapsed ? 'p-2 justify-center' : 'px-3 py-1.5'
                ]"
                title="Log out"
            >
                <LogOut class="w-4 h-4 shrink-0" />
                <span v-if="!isCollapsed">Logout</span>
            </button>
        </div>
    </aside>
</template>
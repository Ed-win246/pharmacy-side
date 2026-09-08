<script setup>
import { ref } from 'vue';
import { LayoutDashboard, Package, FileText, Settings, ChevronDown, Tag, Ruler, Pill } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
const user = ref(null);
const medicineMenuOpen = ref(false);

function toggleMedicineMenu() {
    medicineMenuOpen.value = !medicineMenuOpen.value;
}

const menuItem = [
    { name: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
];

const medicinesubItems = [
    { name: 'Products', icon: Package, route: '/products' },
    { name: 'Categories', icon: Tag, route: '/categories' },
    { name: 'Units', icon: Ruler, route: '/units' },
];

try {
    user.value = JSON.parse(localStorage.getItem('user') || 'null');
} catch {
    user.value = null;
}

const othermenuItems = [
    { name: 'Inventory', icon: FileText, route: '/reports' },
    { name: 'System Settings', icon: Settings, route: '/settings' },
];

function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    router.push('/login');
}
</script>

<template>
    <aside class="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col">
        <div class="p-6 border-b border-gray-200">
            <h1 class="text-2xl font-bold text-green-600">Pharmacy Portal</h1>
        </div>
        <nav class="flex-1 p-4 space-y-1">
            <router-link
                v-for="item in menuItem"
                :key="item.name"
                :to="item.route"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-green-600 transition-colors duration-700"
                active-class="bg-green-50 text-green-600"
            >
                <component :is="item.icon" class="w-4 h-4" />
                {{ item.name }}
            </router-link>

            <button
                @click="toggleMedicineMenu"
                class="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-green-600 transition-colors duration-700"
            >
                <span class="flex items-center gap-3">
                    <Pill class="w-4 h-4" />
                    Medicine
                </span>
                <ChevronDown
                    class="w-4 h-4 transition-transform duration-700 ease-in-out"
                    :class="{ 'rotate-180': medicineMenuOpen }"
                />
            </button>
            <Transition
                    enter-active-class="transition-all duration-500 ease-in-out"
                    leave-active-class="transition-all duration-300 ease-in-out"
                    enter-from-class="opacity-0 max-h-0"
                    enter-to-class="opacity-100 max-h-40"
                    leave-from-class="opacity-100 max-h-40"
                    leave-to-class="opacity-0 max-h-0"
                >
            <div v-if="medicineMenuOpen" class="pl-4 space-y-1">
                <router-link
                    v-for="item in medicinesubItems"
                    :key="item.name"
                    :to="item.route"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-green-600 transition-colors duration-200"
                    active-class="bg-green-50 text-green-600"
                >
                    <component :is="item.icon" class="w-4 h-4" />
                    {{ item.name }}
                </router-link>
            </div>
            </Transition>

            <router-link
                v-for="item in othermenuItems"
                :key="item.name"
                :to="item.route"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-green-600 transition-colors duration-700 ease-in-out"
                active-class="bg-green-50 text-green-600"
            >
                <component :is="item.icon" class="w-4 h-4" />
                {{ item.name }}
            </router-link>
        </nav>
        <div class="p-4 border-t border-gray-200 justify-between items-center flex">
            <div v-if="user" class="mb-3">
                <p class="truncate text-sm font-semibold text-gray-800 pr-2">
                    {{ user.name || user.email }}
                </p>
            </div>
            <button
                @click="logout"
                class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
                Logout
            </button>
        </div>
    </aside>
</template>
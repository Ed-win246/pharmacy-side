<script setup>
import { ref } from 'vue';
import { LayoutDashboard, Package, ShoppingCart, FileText, Settings } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
const user = ref(null);

try {
    user.value = JSON.parse(localStorage.getItem('user') || 'null');
} catch {
    user.value = null;
}

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, route: '/dashboard' },
    { name: 'Products', icon: Package, route: '/products' },
    { name: 'Reports', icon: FileText, route: '/reports' },
    { name: 'Settings', icon: Settings, route: '/settings' },
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
                v-for="item in menuItems" 
                :key="item.name" 
                :to="item.route" 
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-green-600 transition-colors duration-200" 
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
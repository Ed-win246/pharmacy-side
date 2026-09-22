<script setup>
import { ref, onMounted } from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';

const stockItems = ref([]);
const loading = ref(false);

async function fetchPostedStock() {
    loading.value = true;

    try {
        const { data } = await api.get('/stock-items', {
            params: {
                status: 'posted',
            },
        });

        stockItems.value = data;
    } catch (error) {
        console.error('Failed to load posted stock', error);
        toast.error('Failed to load stock');
    } finally {
        loading.value = false;
    }
}

onMounted(fetchPostedStock);
</script>
<template>
    <div class="min-h-screen w-full ">
        <div class="max-w-7xl h-full max-auto flex flex-col overflow-y-auto pb-10 p-2">
            <div class="flex items-center justify-between p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">Stock</h2>
                </div>
                    <div class="font-medium text-sm">
                        <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                        <span class="text-gray-400">/ Stock</span>
                    </div>
            </div>

            <div v-if="loading" class="p-4 text-sm text-gray-500">
                Loading stock...
            </div>

            <div v-else-if="stockItems.length === 0" class="p-4 text-sm text-gray-500">
                No submitted stock found.
            </div>

            <div class="min-h-0 overflow-hidden flex-1 bg-white">
                <div class="h-full w-full overflow-auto">
                    <table class="w-full min-w-[560px] divide-y divide-slate-200 mt-2 text-left text-sm ">
                        <thead class="sticky z-10 border-b border-gray-200 top-0 tracking-wide">
                            <tr>
                                <th class="px-2 py-2 font-medium">#</th>
                                <th class="px-2 py-2 font-medium">Product Name</th>
                                <th class="px-2 py-2 font-medium">Quantity</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200">
                            <tr v-for="(item, index) in stockItems" :key="item.id">
                                <td class="px-2 py-2">{{ index + 1 }}</td>
                                <td class="px-2 py-2">{{ item.name}}</td>
                                <td class="px-2 py-2">{{ item.quantity }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>
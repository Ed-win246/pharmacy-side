<script setup>
import { ref, onMounted,computed } from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { Search , X} from 'lucide-vue-next';


onMounted(fetchPostedStock);


const searchQuery=ref('');
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

const filteredStock = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return stockItems.value;

    return stockItems.value.filter((item) => {
        const name = String(item.name ?? item.medicine_name ?? item.medicine ?? '').toLowerCase();
        const quantity = String(item.quantity ?? '').toLowerCase();

        return name.includes(query) || quantity.includes(query);
    });
});

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

            <div class="relative mx-auto mb-4 w-full max-w-xs">
                <Search class="absolute top-1/2 -translate-y-1/2 left-2.5 w-4 h-4 text-gray-400"/>
                <input type="text"
                v-model="searchQuery"
                placeholder="Search stock.."
                class="text-xs w-full border-gray-400 border rounded-sm pl-8 pr-3 py-1.5">
                <button type="button"
                v-if="searchQuery"
                @click="searchQuery=''"
                class="right-2 absolute -translate-y-1/2 w-4 h-4 flex items-center text-gray-400 justify-center top-1/2">
                <X class="w-4 h-4"/></button>
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
                            <tr v-if="loading">
                                <td  class="px-4 py-12 text-center text-gray-500" colspan="6">Loading Stock...</td>
                            </tr>
                            <tr v-else-if="!stockItems.length">
                                <td  class="px-4 py-12 text-center text-gray-500" colspan="6">No submitted stock found</td>
                            </tr>
                            <tr v-else-if="filteredStock.length === 0">
                                  <td  class="px-4 py-12 text-center text-gray-500" colspan="6">No search match "{{ searchQuery }}"?</td>
                            </tr>
                            <tr v-for="(item, index) in filteredStock" :key="item.id">
                                <td class="px-2 py-2">{{ index + 1 }}</td>
                                <td class="px-2 py-2">{{ item.name ?? item.medicine_name ?? item.medicine }}</td>
                                <td class="px-2 py-2">{{ item.quantity }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>
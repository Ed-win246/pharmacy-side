<script setup>
import { ref, onMounted,computed, watch } from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { Search , X} from 'lucide-vue-next';


onMounted(fetchPostedStock);


const searchQuery=ref('');
const stockItems = ref([]);
const loading = ref(false);

//pagination state
const currentPage=ref(1);
const pageSize=ref(10);
const pageSizeOptions=[10,50,100,150,200];

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
//total pages
const totalPages=computed(()=>{
    return Math.ceil(filteredStock.value.length / pageSize.value) || 1;
});

const paginatedItems=computed(()=>{
    const start=(currentPage.value -1)*pageSize.value;
    const end= start + pageSize.value;
    return filteredStock.value.slice(start,end);
});

const visiblePageNumbers=computed(()=>{
    const pages=[];
    for(let i=1;i<=totalPages.value;i++){
        pages.push(i);
    }
    return pages;
});
//watch the current page value 
watch([pageSize, searchQuery,()=>stockItems.value.length],()=>{
    currentPage.value=1;
});

function goToPage(page){
    if(page <1 || page > totalPages.value) return;
        currentPage.value=page;
}
function nextPage(){
    goToPage(currentPage.value + 1);
}
function prevPage(){
    goToPage(currentPage.value - 1);
}
</script>
<template>
    <div class="min-h-screen w-full ">
        <div class=" flex flex-col  pb-10 p-2">
            <div class="flex items-center justify-between p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">Stock</h2>
                </div>
                    <div class="font-medium text-sm">
                        <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                        <span class="text-gray-400">/ Stock</span>
                    </div>
            </div>

            <div class="flex  items-center justify-between gap-4">
                <div class="flex items-center gap-2 text-xs text-gray-600">
                    <span>Show</span>
                    <select v-model="pageSize" class="w-auto rounded-sm text-xs py-1 px-2 border border-gray-400">
                        <option v-for="size in pageSizeOptions" :key="size" :value="size">
                            {{ size }}
                        </option>
                    </select>
                    <span>entries</span>
                </div>
            
                <div class="relative ml-auto mb-2 w-full max-w-[200px]">
                    <Search class="absolute top-1/2 -translate-y-1/2 left-2.5 w-4 h-4 text-gray-400"/>
                    <input type="text"
                    v-model="searchQuery"
                    placeholder="Search stock.."
                    class="text-xs w-full border-gray-400 border rounded-sm pl-8 pr-8 py-1.5">
                    <button type="button"
                    v-if="searchQuery"
                    @click="searchQuery=''"
                    class="right-2 absolute -translate-y-1/2 w-4 h-4 flex items-center text-gray-400 justify-center top-1/2">
                    <X class="w-4 h-4"/></button>
                </div>
             </div>
            <div class="min-h-0 overflow-hidden flex-1 bg-white rounded-sm mt-4">
                <div class="h-full w-full overflow-auto">
                    <table class="w-full min-w-[560px] divide-y divide-slate-200 mt-2 text-left text-sm ">
                        <thead class="sticky z-10 border-b border-gray-200 top-0 tracking-wide">
                            <tr>
                                <th class="px-3 py-2 font-medium">#</th>
                                <th class="px-3 py-2 font-medium">Product Name</th>
                                <th class="px-3 py-2 font-medium">Quantity</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200">
                            <tr v-if="loading">
                                <td  class="px-4 py-12 text-center text-gray-500" colspan="3">Loading Stock...</td>
                            </tr>
                            <tr v-else-if="!stockItems.length">
                                <td  class="px-4 py-12 text-center text-gray-500" colspan="3">No submitted stock found</td>
                            </tr>
                            <tr v-else-if="filteredStock.length === 0">
                                  <td  class="px-4 py-12 text-center text-gray-500" colspan="3">No search match "{{ searchQuery }}"?</td>
                            </tr>
                            <tr v-for="(item, index) in paginatedItems" :key="item.id">
                                <td class="px-3 py-2">{{(currentPage -1 )*pageSize+ index + 1 }}</td>
                                <td class="px-3 py-2">{{ item.name ?? item.medicine_name ?? item.medicine }}</td>
                                <!-- <td class="px-2 py-2">{{ item.quantity }}</td> -->
                                <td class="px-3 py-2">{{ item.quantity }} {{ item.unit_name }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="flex justify-end py-3 px-2 text-xs text-gray-600">
                        <div class="flex items-center gap-2 mr-2">
                            <span>Page {{ currentPage }} of {{ totalPages }}</span>
                        </div>
                        <button v-for="page in visiblePageNumbers"
                        @click="goToPage(page)"
                        :class="[
                            'h-7 w-7 border rounded-full text-xs min-w-[28px] items-center justify-center flex',
                            page === currentPage
                                ?'bg-green-600 text-white border-green-600'
                                :'boder-gray-300 hover:bg-gray-100'  
                        ]"
                        >{{ page }}</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
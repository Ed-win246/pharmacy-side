<script setup>
import {ref, onMounted,computed} from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { Check ,Search,X} from 'lucide-vue-next';
import { stringifyQuery } from 'vue-router';

const stocklevels=ref([]);
const loading=ref(false);
const activatingId=ref(null);
const searchQuery=ref('');

onMounted (async()=>{
   await fetchStockLevels();
});


async function fetchStockLevels(){
    loading.value=true;

    try{
        const {data}= await api.get('/stock-levels');
        stocklevels.value=data;
    }catch(error){
        console.error('Failed to fetch stock levels',error);
        toast.error('Failed to fetch stock levels');
    }finally{
        loading.value=false;
    }
}
async function activateLevel(level){
    if(level.is_active) return;
    activatingId.value=level.id;

    try{
        await api.post(`/stock-levels/${level.id}/activate`);

        stocklevels.value=stocklevels.value.map(l=>l.id === level.id ?
            {...l,is_active:true} :l
        );
        toast.success(`${level.medicine_name} activated successfully`);

    }catch(error){
        console.error('Failed to activate stock level',error);
        toast.error('Failed to activate stock level');
    }finally{
        activatingId.value=null;
    }
}


const groupedStockLevels=computed(()=>{
    const groups={};
    filteredStock.value.forEach((level)=>{
        const key=level.medicine_name || 'unknown';
        if(!groups[key]){
            groups[key]={
                medicine_name:level.medicine_name,
                category:level.category,
                batches:[]
            };
        }
        groups[key].batches.push(level);
    });

    return Object.values(groups);
});

const filteredStock=computed(()=>{
    const query=searchQuery.value.trim().toLocaleLowerCase();

    if(!query) return stocklevels.value;

    return stocklevels.value.filter(l=> String(l.medicine_name ?? '').toLocaleLowerCase().includes(query) ||
                                      String  (l.batch_number ?? '').toLocaleLowerCase().includes(query) ||
                                       String (l.quantity ?? '').includes(query) ||
                                       String(l.buying_price ?? '').toLocaleLowerCase().includes(query) ||
                                       String (l.expiry_date ?? '').toLocaleLowerCase().includes(query));
});
</script>
<template>
    <div class="min-h-screen w-full">
        <div class="max-w-7xl h-full mx-auto flex flex-col overflow-y-auto pb-10 p-2">
            <div class="flex items-center justify-between p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">Batch Levels</h2>
                </div>
                    <div class="font-medium text-sm">
                        <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                        <span class="text-gray-400">/ Batch Levels</span>
                    </div>
            </div>

            <div class="relative flex-1 min-w-[180px] max-w-xs">
                <Search class="absolute top-1/2 left-2.5 -translate-y-1/2 w-4 h-4 text-gray-400 "/>
                <input type="text"
                v-model="searchQuery"
                placeholder="Search.."
                class="w-full border border-gray-300 rounded-sm pl-8 pr-3 py-1.5 text-xs">
                <button type="button"
                v-if="searchQuery"
                @click="searchQuery=''"
                aria-label="clear search"
                class="absolute -translate-y-1/2 top-1/2 right-2 flex items-center justify-center w-4 h-4 text-gray-400">
                <X class="w-4 w-4 cursor-pointer"/>
                </button>
            </div>

            <div class="min-h-0 overflow-hidden flex-1 bg-white shadow-sm mt-4">
                <div class="w-full h-full overflow-auto">
                    <table class="w-full min-w-[560px] divide-y divide-slate-100 text-left text-sm ">
                        <thead class="sticky top-0 border-b bg-white z-10 tracking-wide ">
                            <tr>
                                <td class="px-2 py-2 font-medium">#</td>
                                <td class="px-2 py-2 font-medium">Product</td>
                                <td class="px-2 py-2 font-medium">Batch</td>
                                <td class="px-2 py-2 font-medium">Quantity</td>
                                <td class="px-2 py-2 font-medium">Buy Price</td>
                                <td class="px-2 py-2 font-medium">Expiry Date</td>
                                <td class="px-2 py-2 font-medium">Actions</td>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                                <tr v-if="loading">
                                    <td class="py-12 px-4 text-center text-gray-400" colspan="7">
                                        Loading stock levels
                                    </td>
                                </tr>
                                <tr v-else-if="filteredStock.length === 0">
                                    <td colspan="5" class="px-4 py-12 text-center text-gray-500">No stock batch match "{{ searchQuery }}"</td>
                                </tr>
                                <tr v-else-if="!stocklevels.length" >
                                    <td class="px-4 py-12 text-center text-gray-400" colspan="7">
                                        No stock found. Please register your stock.
                                    </td>
                                </tr>
                                <tr v-else v-for="(group, groupIndex) in groupedStockLevels" :key="group.medicine_name" class="hover:bg-slate-50 border-b border-slate-100">
                                    <td class="px-2 py-3 font-medium align-middle">
                                        {{ groupIndex + 1 }}
                                    </td>
                                    <td class="px-2 py-3 text-xs align-middle">
                                        <div class="font-medium text-gray-900 text-sm">{{ group.medicine_name }}</div>
                                        <div class="text-green-500 font-medium">{{ group.category }}</div>
                                    </td>
                                    <td class="px-2 py-3 font-medium align-middle">
                                        <div class="flex flex-col gap-2">
                                            <div v-for="level in group.batches" :key="level.id" class="h-8 flex items-center">
                                                {{ level.batch_number || '—' }}
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-2 py-3 font-medium align-middle">
                                        <div class="flex flex-col gap-2">
                                            <div v-for="level in group.batches" :key="level.id" class="h-8 flex items-center">
                                                {{ level.quantity }}
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-2 py-3 font-medium align-middle">
                                        <div class="flex flex-col gap-2">
                                            <div v-for="level in group.batches" :key="level.id" class="h-8 flex items-center">
                                                {{ level.buying_price }}
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-2 py-3 font-medium align-middle">
                                        <div class="flex flex-col gap-2">
                                            <div v-for="level in group.batches" :key="level.id" class="h-8 flex items-center">
                                                {{ level.expiry_date || '—' }}
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-2 py-3 align-middle">
                                        <div class="flex flex-col gap-2">
                                            <div v-for="level in group.batches" :key="level.id" class="h-8 flex items-center">
                                                <button
                                                    @click="activateLevel(level)"
                                                    :disabled="level.is_active || activatingId === level.id"
                                                    class="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors"
                                                    :class="level.is_active
                                                        ? 'bg-green-100 text-green-700 cursor-default'
                                                        : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer disabled:opacity-50'"
                                                >
                                                    <Check v-if="level.is_active" class="w-3.5 h-3.5" />
                                                    {{ activatingId === level.id ? 'Activating...' : (level.is_active ? 'Activated' : 'Activate') }}
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>
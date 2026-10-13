<script setup>
import {ref, reactive, onMounted} from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { Eye } from 'lucide-vue-next';
import { categories } from '@vueuse/core/metadata.mjs';

const stockLevels = ref([]);
const loading = ref(false);

onMounted(fetchStockLevels);

async function fetchStockLevels(){
    loading.value = true;

    try{
        const {data} = await api.get('/stock-levels');
        stockLevels.value = data;
    }catch(error){
        console.error('Failed to fetch batch levels',error);
        toast.error('Failed to fetch stock levels');
    }finally{
        loading.value = false;
    }
}

const byExpiry = (a,b)=> String(a.expiry_date ?? '9999').localeCompare(String(b.expiry_date ?? '9999'));

//one entry per product, holding all the batches
const products=computed(()=>{
    const groups= {};

    stockLevels.value.forEach((level)=>{
        const name = String(level.medicine_name ?? '').trim() || 'unknown';
        const key = name.toLowerCase();


        if(!groups[key]){
            groups[key] = {
                key, name, category:level.category, batches :[],
            }
        }
        if(!groups[key].category && level.category){
            groups[key].category = level.category;
        }
        groups[key].batches.push(level);//stores the batch numbers so changing one changins the batch level in stock levels
    });

    Object.values(groups).forEach((g)=>g.batches.sort(byExpiry));
    return Object.values(groups).sort((a,b)=>a.name.localeCompare(b.name));
})

const productRows = computed(()=>{
    products.value.map((p)=>({
        key:p.key,
        name:p.name,
        category:p.category,
        
    }))
})

</script>
<template>
    <div class="min-h-screen w-full">
        <div class=" h-full  flex flex-col pb-10 p-2">
            <div class="flex items-center justify-between  p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">Reconcile Stock</h2>
                </div>
                    <div class="font-medium text-sm">
                        <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                        <span class="text-gray-400">/ Reconcile Stock</span>
                    </div>
            </div>

            <div class="mt-2 bg-white shadow-sm overflow-x-auto rounded-sm">
                <table class="w-full text-sm text-left">
                    <thead class="tracking-wider border-b border-gray-200 text-xs">
                        <tr>
                            <th class="px-4 py-3 font-medium">#</th>
                            <th class="px-4 py-3 font-medium">Product</th>
                            <th class="px-4 py-3 font-medium">Category</th>
                            <th class="px-4 py-3 font-medium">Batches</th>
                            <th class="px-4 py-3 font-medium">Price</th>
                            <th class="px-4 py-3 font-medium">Added By</th>
                            <th class="px-4 py-3 font-medium">Reconcile</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 text-gray-500">
                        <tr v-if="reconcileStock.length === 0">
                            <td class="px-4 py-12 text-center " colspan="8">
                                No data found to reconcile...
                            </td>
                        </tr>
                        <tr></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
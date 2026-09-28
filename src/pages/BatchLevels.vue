<script setup>
import {ref, onMounted} from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { Check } from 'lucide-vue-next';

const stocklevels=ref([]);
const loading=ref(false);
const activatingId=ref(null);

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
        let success = false;
        try {
            await api.post(`/stock-levels/${level.id}/activate`);
            success = true;
        } catch (err) {
            console.warn('Primary endpoint error:', err.response?.data || err.message);
            if (err.response?.status === 500 || err.response?.status === 404) {
                try {
                    await api.put(`/stock-levels/${level.id}`, { is_active: true });
                    success = true;
                } catch (fallbackErr) {
                    console.error('Secondary endpoint error:', fallbackErr.response?.data || fallbackErr.message);
                }
            }
        }

        stocklevels.value=stocklevels.value.map(l=>l.id === level.id ?
            {...l,is_active:true} :l
        );

        if (success) {
            toast.success(`${level.medicine_name || level.medicine || 'Batch'} activated successfully`);
        } else {
            toast.info(`${level.medicine_name || level.medicine || 'Batch'} marked active`);
        }

    }catch(error){
        console.error('Failed to activate stock level', error.response?.data || error);
        toast.error('Failed to activate stock level');
    }finally{
        activatingId.value=null;
    }
}
</script>
<template>
    <div class="min-h-screen w-full">
        <div class="max-w-7xl h-full max-auto flex flex-col overflow-y-auto pb-10 p-2">
            <div class="flex items-center justify-between p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">Batch Levels</h2>
                </div>
                    <div class="font-medium text-sm">
                        <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                        <span class="text-gray-400">/ Batch Levels</span>
                    </div>
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
                                    <td class="py-12 px-4 text-center text-gray-400" colspan="8">
                                        Loading stock levels
                                    </td>
                                </tr>
                                <tr v-else-if="!stocklevels.length" >
                                    <td class="px-4 py-12 text-center text-gray-400" colspan="8">
                                        No stock found. Please register your stock.
                                    </td>
                                </tr>
                                <tr v-for="(level, index) in stocklevels" :key="level.id">
                                    <td class="px-2 py-2 font-medium">{{ index + 1 }}</td>
                                    <td class="px-2 py-2 text-xs">
                                        <div>{{ level.medicine_name }}</div>
                                        <div class="text-green-400">{{ level.category }}</div>
                                    </td>
                                    
                                    <td class="px-2 py-2 font-medium">{{ level.batch_number || '—' }}</td>
                                    <td class="px-2 py-2 font-medium">{{ level.quantity }}</td>
                                    <td class="px-2 py-2 font-medium">{{ level.buying_price }}</td>
                                    <td class="px-2 py-2 font-medium">{{ level.expiry_date || '—' }}</td>
                                    <td class="px-2 py-2">
                                        <button
                                            @click="activateLevel(level)"
                                            :disabled="level.is_active || activatingId === level.id"
                                            class="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors"
                                            :class="level.is_active
                                                ? 'bg-green-100 text-green-700 cursor-default'
                                                : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer disabled:opacity-50'"
                                        >
                                            <Check v-if="level.is_active" class="w-3.5 h-3.5" />
                                            {{ activatingId === level.id ? 'Activating...' : (level.is_active ? 'Active' : 'Activate') }}
                                        </button>
                                    </td>
                                </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>
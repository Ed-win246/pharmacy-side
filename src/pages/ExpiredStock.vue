<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';


const stockLevels = ref([]);
const loading = ref(false);

onMounted(fetchStockLevels);

async function fetchStockLevels(){
    loading.value = true;

    try{
        const {data} = await api.get('/stock-levels');
        stockLevels.value = data;
    }catch(error){
        console.error('Failed to fetch stock levels',error);
        toast.error('Failed to fetch stock levels');
    }finally{
        loading.value = false;
    }
}

//date logic, the server send the date only so characters beyond that are cut off
const dateOnly = (value)=>(value ? String(value).slice(0,10):'');

//expired = negatuve , 0 = eexpires today , null=no date valiable
function daysUntil(value){
    const match = dateOnly(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match) return null;

    const expiry = Date.UTC(+match[1], +match[2]-1, +match[3]);
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(),now.getDate());
     return Math.round((expiry - today)/86400000);
}

const soonDays = ref(14);
function statusOf(days){
    if(days === null) return 'unknown';
    if(days < 0 ) return 'expired';
    if(days <= soonDays.value) return 'expiring soon';
    return 'valid';
}
//display each batch cleanly with its data , expiry date 
const formatMoney = (value) =>Number(value || 0).toLocaleString()
const rows = computed(()=>
    stockLevels.value
    .filter((l)=>Number(l.quantity)>0)
    .map((l)=>{
        const days = daysUntil(l.expiry_date);
        return{
            id:l.id,
            product: String(l.medicine_name ?? '').trim(),
            category: l.category,
            batch_number: l.batch_number,
            quantity: Number(l.quantity),
            unit_name: l.unit_name,
            value: Number(l.buying_price || 0),
            expiry_date: dateOnly(l.expiry_date),
            days,
            status: statusOf(days),
        }
    })
    .filter((r)=>r.status !== 'unknown')
    .sort((a,b)=>a.days -b.days)
)

const statusStyles = {
    expired: { backgroundColor:'#fee2e2', color: '#dc2626' },
    'expiring soon': {backgroundColor:'#ffedd5',  color: '#f97316' },
    valid: {backgroundColor:'#dcfce7',  color: '#16a34a' },
};

function statusLabel(row){
    if(row.days < 0){
        const days = Math.abs(row.days);
        return `Expired ${days} day${days === 1 ? '' : 's'} ago`;
    }
    if(row.days === 0) return 'Expires today';
    return `Expires in ${row.days} day${row.days === 1 ? '' : 's'}`;
}
</script>
<template>
    <div class="min-h-screen w-full">
        <div class=" h-full flex flex-col  pb-10 p-2">
            <div class="flex items-center justify-between p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">Expired Products</h2>
                </div>
                    <div class="font-medium text-sm">
                        <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                        <span class="text-gray-400">/ Expired Products</span>
                    </div>
            </div>
            <div class="bg-white shadow-sm mt-2 rounded-sm">
                <p class="p-4 text-xs">Batches loaded: {{ stockLevels.length }}</p>
                <table class="w-full text-sm text-left">
                    <thead class="border-b border-gray-200 text-sm tracking-wide">
                        <tr>
                            <td class="px-4 py-3 font-medium">#</td>
                            <td class="px-4 py-3 font-medium">Batch</td>
                            <td class="px-4 py-3 font-medium">Quantity</td>
                            <td class="px-4 py-3 font-medium">Value</td>
                            <td class="px-4 py-3 font-medium">Expiry Date</td> 
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
                        <tr v-if="loading">
                            <td class="px-4 py-12 text-center text-gray-600" colspan="6">
                                Loading stock products..
                            </td>
                        </tr>
                        <tr v-else-if="rows.length === 0">
                            <td class="px-4 py-12 text-center text-gray-600 " colspan="6">
                                No stock found...
                            </td>
                        </tr>
                        <tr v-for="(row, index) in rows" :key="row.id" class="text-xs text-gray-600">
                            <td class="px-4 py-3">{{ index + 1 }}</td>
                            <td class="px-4 py-3">
                                <div class="text-gray-600">{{ row.batch_number }}</div>
                                <div class="text-green-600">{{ row.product }}</div>
                            </td>
                            <td class="px-4 py-3">{{ row.quantity }} {{ row.unit_name }}</td>
                            <td class="px-4 py-3">{{ formatMoney(row.value) }}</td>
                            <td class="px-4 py-3">
                                <div class="flex flex-col items-start gap-1">
                                    <span :style="{ color: statusStyles[row.status].color }">
                                        {{ row.expiry_date }}
                                    </span>
                                    <span class="rounded-sm px-2 py-1 " :style="statusStyles[row.status]">
                                        {{ statusLabel(row) }}
                                    </span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
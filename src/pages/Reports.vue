<script setup>
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import {ref, computed,onMounted, } from 'vue';

const medicines= ref([]);
const loading =ref(true);

onMounted(async()=>{
    await fetchMedicines();
});

async function fetchMedicines(){
    loading.value=true;
    try{
        const {data}= await api.get('/medicines');
        medicines.value=data;
    }catch(error){
        console.error('Failed to load metrics',error);
        toast.error('Failed to load metrics data');
    }finally{
        loading.value=false;
    }
}

const totalstockQuantity = computed(()=>{
    return medicines.value.reduce((sum, item)=>sum + (Number(item.stockQuantity) || 0), 0);
});

const totalInventoryValue = computed(()=>{
    return medicines.value.reduce((sum, item)=>{
        const quantity= Number(item.stockQuantity) || 0;
        const price= Number(item.unitPrice) || 0;
        return sum + (quantity * price);
    },0);
});

const lowstockQuantity=computed(()=>{
    return medicines.value.filter(item=>Number(item.stockQuantity)<10).length;
});

const expiringSooncount=computed(()=>{
    const today = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(today.getDate() + 60);

    return medicines.value.filter(item=>{
        if(!item.expiryDate) return false;
        const expiry= new Date(item.expiryDate);
        return expiry >= today && expiry <= sixtyDaysFromNow;
    }).length;
});


</script>
<template >
    <div class="p-6 max-w-7xl mx-auto space-y-6">
        <div>
            <h1 class="font-bold text-2xl text-gray-800">Reports & Analytics</h1>
            <p class="text-muted-foreground">A summary of all your Inventory</p>
        </div>
    </div>
</template> 
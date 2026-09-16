<script setup>
import { onMounted, reactive, ref } from 'vue';
import api from '@/lib/api';
import {Plus, X, ListCheck, CircleCheckIcon} from 'lucide-vue-next';
import toast from '@tsirosgeorge/toastnotification';

const loading=ref(false);
const medicines=ref([]);
const categories=ref([]);
const units=ref([]);
const form=reactive({
    category:'',
    unit:'',
    medicine:'',
})


onMounted(async()=>{
    await Promise.all([fetchMedicines(), fetchCategories(), fetchUnits()])
});

async function fetchMedicines(){
    loading.value=true;
    try{
        const {data}= await api.get('/medicines');
        medicines.value=data;
    }catch(error){
        console.error('Failed to load Products',error);
        toast.error('Failed to load Products. Please try again later');
    }finally{
        loading.value=false;
    }
}

async function fetchCategories(){
    loading.value=true;
    try{
        const {data}= await api.get('/categories');
        categories.value=data;
    }catch(error){
        console.error('Failed to load Product Categories', error);
        toast.error('Failed to load categories. PLease try again later');
    }finally{
        loading.value=false;
    }
}

async function fetchUnits(){
    loading.value=true;
    try{
        const {data}= await api.get('/units');
        units.value=data;
    }catch(error){
        console.error('Failed to load product units',error);
        toast.error('Failed to load Product Units');
    }finally{
        loading.value=false;
    }

}
</script>
<template>
    <div class="h-full max-w-7xl max-auto flex flex-col overflow-y-auto space-y-6 pb-10 p-2">
        <div class="flex items-center justify-between border-b border-gray-200 pb-4">
            <div>
                <h2 class="font-medium text-sm text-gray-500 uppercase flex items-center gap-2">
                    <ListCheck class="w-4 h-4"/>
                    Add Stock
                </h2>
            </div>
            <div class="font-medium text-sm">
                <router-link to="/dashboard" class="cursor-pointer text-black-300">Dashboard</router-link>
                <span class="text-gray-400"> / Add Stock</span>
            </div>
        </div>
        <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <div class="bg-white rounded-lg shadow-sm space-y-4 p-5 border-gray-200 ">
            <form class="space-y-4">
                <div>
                    <label for="category" class="block text-sm font-medium text-gray-700">Category</label>
                    <select name="category" id="category" v-model="form.category" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                        <option value="">Select option</option>
                        <option v-for="categoryOption in categories" :key="categoryOption.id" :value="categoryOption.Category_name">
                            {{ categoryOption.Category_name }}
                        </option>
                    </select>
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label for="product" class="block text-sm font-medium text-gray-700">Product</label>
                        <select id="product" v-model="form.medicine" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                            <option value="">Select option</option>
                            <option v-for="medicine in medicines" :key="medicine.id" :value="medicine.name">
                                {{ medicine.name }}
                            </option>
                        </select>
                    </div>
                    <div>
                        <label for="unit" class="block text-sm font-medium text-gray-700">Unit</label>
                        <select id="unit" v-model="form.unit" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                            <option value="" class="text-gray-400">Select option</option>
                            <option v-for="unit in units" :key="unit.id" :value="unit.unit_name">
                                {{ unit.unit_name }}
                            </option>
                        </select>
                    </div>
                </div>
                <div>
                    <label for="total-product-price" class="block text-sm font-medium text-gray-700">Total Buying Price</label>
                    <input id="total-product-price" type="number" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                </div>
                <div class="border-b-2 border-gray-200 pb-4">
                    <label for="quantity" class="block text-sm font-medium text-gray-700">Quantity</label>
                    <input id="quantity" type="number" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label for="batch-number" class="block text-sm font-medium text-gray-700">Batch Number</label>
                        <input id="batch-number" type="text" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm " placeholder="BATCH-LM09">
                    </div>
                    <div>
                        <label for="expiry-date" class="block text-sm font-medium text-gray-700">Expiry Date</label>
                        <input id="expiry-date" type="date" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    </div>
                </div>
                <button class="w-full bg-green-500 rounded-sm items-center justify-center flex px-4 py-2 text-white font-medium cursor-pointer">
                   <CircleCheckIcon class="w-4 h-4"/> Submit</button>
            </form>
            </div>
        </div>
    </div>
</template>
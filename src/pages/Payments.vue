<script setup>
import {ref, onMounted} from 'vue'
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import {X, Plus, Trash2, SquarePenIcon} from 'lucide-vue-next';


const payments=ref([]);
const loading=ref(false);
const deleting=ref(false);
const editingId=ref(null);
const showModal=ref(false);
const OptionToDelete=ref(false);
const saving=ref(false);
const isEditingForm=ref(false);
const showDeleteModal=ref(false);
const loggedUser=ref(null);


try{
    loggedUser.value=JSON.parse(localStorage.getItem('user') || 'null');
}catch{
    loggedUser.value=null;
}


onMounted(async()=>{
    await fetchPayments();
});

async function fetchPayments(){
    loading.value=true;
    try{
        const {data}= await api.get('/payments');
        payments.value=data;
    }catch(error){
        console.error('Error fetching payments', error);
        toast.error('Error fetching payments');
    }finally{
        loading.value=false;
    }
}


// const form=reactive([

// ]);


</script>
<template>
    <div class="min-h-screen w-full">
          <div class="h-full max-w-7xl max-auto flex-col overflow-y-auto pb-5 p-2 ">
            <div class="flex items-center justify-between border-b border-gray-200 px-2 py-1">
                <div>
                    <h2 class="font-medium text-sm uppercase flex items-center gap-2">Payment Options</h2>
                </div>
                <div>
                    <h2 class="font-medium text-sm">
                        <router-link to="/dashboard" class="text-black font-medium">Dashboard</router-link>
                        <span class="text-gray-400">/ Payment Options</span>
                    </h2>
                </div>
            </div>
          </div>
    </div>
</template>
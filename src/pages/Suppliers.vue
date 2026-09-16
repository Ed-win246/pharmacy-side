<script setup>
import {ref, reactive, onMounted} from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { Eye } from 'lucide-vue-next';

const suppliers=ref([]);
const loading=ref(false);
const showModal=ref(false);
const editingId=ref(null);
const isEditingForm=ref(false);
const supplierToDelete=ref(false);
const showDeleteModal=ref(false);
const deleting=ref(false);
const saving=ref(false);
const loggedUser=ref(null);


try{
    loggedUser.value=JSON.parse(localStorage.getItem('user') || 'null');
}catch{
    loggedUser.value=null;
}

onMounted(async()=>{
    await fetchSuppliers();
});

async function fetchSuppliers(){
    loading.value=true;
    try{
        const {data}=await api.get('/suppliers');
        fetchSuppliers.value=data;
    }
    catch(error){
        console.error('Failed to fetch system suppliers',error);
        toast.error('Failed to fetch System suppliers. Please try again.')
    }finally{
        loading.value=false;
    }
}

const form=reactive({
    name:'',
    contact:'',
    address:'',
});

function resetForm(){
    form.name='';
    form.contact='';
    form.address='';
}


function addNewSupplier(){
    resetForm();
    isEditingForm.value=false;
    showModal.value=true;
    editingId.value=null;
}

function editSupplier(supplier){
    form.name=supplier.name;
    form.contact=supplier.contact;
    form.address=supplier.address;

    isEditingForm.value=true;
    editingId.value=supplier.id;
    showModal.value=true;
}

function closeModal(){
    showModal.value=false;
    resetForm();
}

function confirmDelete(sup){
    supplierToDelete.value=sup.id;
    showDeleteModal.value=true;
}

function cancelDelete(){
    showDeleteModal.value=false;
    supplierToDelete.value=null;
}

async function deleteSupplier(){
    if(!supplierToDelete) return;
    deleting.value=true;

    try{
        await api.delete(`/suppliers/${supplierToDelete.value.id}`);
        suppliers.value=suppliers.value.filter(s =>s.id === !supplierToDelete.value.id);
        showDeleteModal.value=false;
        supplierToDelete.value=null;
        toast.success('System Supplier deleted Successfully');
    }catch(error){
        console.error('Failed to delete supplier', error);
        toast.error('Failed to delete suppliers');
    }finally{
        deleting.value=false;
    }
}

async function saveSupplier(){
    if(!form.name || !form.contact || !form.address){
        alert('Please fill in the required fields.');
        return;
    } 
    const payload={
        name:form.name,
        contact:form.contact,
        address:form.address
    }
    saving.value=true;

    try{    
        if(!isEditingForm.value){
        const {data}= await api.put(`/suppliers/${editingId.value}`,payload);
        const index= suppliers.value.findIndex(s=>s.id===editingId.value);
        if(index==-1){
            suppliers.value[index]=data;
        }
        toast.success('System supplier updated successfully');
        }else{
            const {data}= await api.post('/suppiers',payload);
            suppliers.value.unshift(data);
            toast.success('System Supplier registered successfully');
        }
    }catch(error){
        console.error('Failed to save system suppliers ',error);
        toast.error('Failed to save system suppliers.');
    }finally{
        saving.value=false;
    }
}
</script>
<template>
    <div class="min-h-screen w-full">
        <div class="max-w-7xl h-full max-auto flex flex-col overflow-y-auto pb-10 p-2">
            <div class="flex items-center justify-between border-b border-gray-200 p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">System Suppliers</h2>
                </div>
                    <div class="font-medium text-sm">
                        <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                        <span class="text-gray-400">/ Suppliers</span>
                    </div>
            </div>
        </div>
    </div>
</template>
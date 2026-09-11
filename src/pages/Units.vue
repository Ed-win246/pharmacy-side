<script setup>
import {ref, onMounted, reactive, computed} from 'vue';
import { Trash2, Search, SquarePenIcon, X, Plus, CircleCheckIcon } from 'lucide-vue-next';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';

const units=ref([]);
const showModal=ref(false);
const loading=ref(false);
const editingId=ref(false);
const isEditingForm=ref(false);
const unitToDelete=ref(false);
const showDeleteModal=ref(false);
const deleting=ref(false);
const loggedUser=ref(null);
const searchQuery=ref('');
const saving=ref(false);


const filterUnits=computed(()=>{
    if(!searchQuery.value.trim()){
        return units.value;
    }
    const query=searchQuery.value.trim().toLowerCase();
    return units.value.filter(u=>u.name.toLowerCase().includes(query));
});


try{
    loggedUser.value=JSON.parse(localStorage.getItem('User' || 'null'));
}catch{
    loggedUser.value=null;
}

onMounted(async()=>{
    await fetchUnits();
});

async function fetchUnits(){
    loading.value=true
    try{
        const {data}= await api.get('/units');
        units.value=data;
    }catch(error){
        console.error('Error fecthing product Units');
        toast.error('Error fetching product units');
    }finally{
        loading.value=false;
    }
}

const form =reactive({
    unit_name:'',
});

function resetForm(){
    form.unit_name='';
}


function addNewUnit(){
    resetForm();
    editingId.value=null;
    showModal.value=true;
    isEditingForm.value=false;
}

function editUnit(unit){
    form.unit_name=unit.unit_name;

    editingId.value=unit.id;
    isEditingForm.value=true;
    showModal.value=true;
}

function closeModal(){
    showModal.value=false;
    resetForm();
}

function confirmDelete(uni){
    unitToDelete.value=uni;
    showDeleteModal.value=true;
}

function cancelDelete(){
    showDeleteModal.value=false;
    unitToDelete.value=null;
}

async function deleteUnit(){
    if(!unitToDelete.value) return;
    deleting.value=true;

    try{
        await api.delete(`/units/${unitToDelete.value.id}`);
        units.value= units.value.filter(u =>u !==unitToDelete.value.id);
        showDeleteModal.value=false;
        unitToDelete.value=null;
        toast.success('Product Unit deleted successfully');

    }catch(error){
        console.error('Error deleting product unit');
        toast.error('Error deleting product unit');
    }finally{
        deleting.value=false;
    }
}

function getAddedBy(unit){
    return unit.addedBy?.name
    || unit.addedBy?.email
    || unit.addedByname
    || unit.createdBy?.name
    || unit.createdBy?.email
    || loggedUser.value?.name
    || loggedUser.value?.email
    || 'Not available';
}

function formatDateOnly(value){
    if(!value) return 'Not available';
    return String(value).split(/[T]/)[0];
}

async function saveUnit(){
    if(!form.unit_name){
        alert('Please fill in the required field');
        return;
    }
    const payload={
        unit_name:form.unit_name
    }

    saving.value=true;
    try{
        if(!isEditingForm.value){// editing a product unit
            const {data}= await api.put(`/units/${editingId.value}`,payload);
            const index = units.value.findIndex(u=>u.id===editingId.value);
            if(index !==-1){
                units.value[index]=data;
            }
            toast.success('Product Unit updated successfully');
        }else{//registering a new unit 
            const {data}= await api.post('/units', payload);
            units.value.unshift(data);
            toast.success('Product Unit registered successfully');
        }
        closeModal();

    }catch(error){
        console.error('Error saving product units',error);
        toast.error('Failed to save product unit');

    }finally{
        saving.value=false;
    }
} 
</script>
<template>
    <div class="h-full max-w-7xl mx-auto flex flex-col space-y-6 overflow-hidden">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-1xl font-medium tracking-wide text-gray-700 uppercase">
                    Product Units
                </h2>
                <p class="text-sm text-muted-foreground text-gray-400">Manage Product Units Here</p>
            </div>
            <button 
                @click="addNewUnit"
                class="flex items-center gap-2 bg-green-500 px-3 py-2 text-sm font-medium text-white cursor-pointer rounded-sm">
                <Plus class="w-4 h-4"/>New Product Unit
            </button>
        </div>
        <div class="relative max-w-sm pl-2">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <input 
                v-model="searchQuery"
                type="text"
                placeholder="search units..."
                class="w-full pl-9 pr-9 py-2 border border-gray-200 rounded-sm text-sm focus:ring-2 focus:ring-green-500 outline-none">
            <button
            v-if="searchQuery"
                @click="searchQuery=''" 
                class="absolute right-2 top-1/2 -translate-1/2 w-6 h-6 flex items-center justify-center text-gray-200 "
                type="button"
                arial-label="Clear search"><X class="w-4 h-4"/>
            </button>
        </div>

        <div class="min-h-screen flex-1 bg-white shadow-sm overflow-hidden">
            <div class="w-full overflow-auto">
                <table class="w-[90%] min-w-[620px] text-sm text-left text-black divide-y divide-slate-100">
                    <thead class="sticky top-0 z-10 border-b bg-white text-xs tracking-wide text-black">
                        <tr>
                            <th class="py-4 px-4 font-medium">#</th>
                            <th class="py-4 px-4 font-medium">Name</th>
                            <th class="py-4 px-4 font-medium">Added-by</th>
                            <th class="py-4 px-4 font-medium ">Added-on</th>
                            <th class="py-4 px-4 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr v-if="loading">
                            <td class="py-12 px-6 text-center text-gray-400" colspan="5">
                                No Product unit Data Found..
                            </td>
                        </tr>
                        <tr v-else-if="filterUnits.length===0">
                            <td class="px-6 py-12 text-center text-gray-400" colspan="5">
                                {{ searchQuery? 'No Product Unit search matchs your search':'No product unit found' }}
                            </td>
                        </tr>
                        <tr v-for="(uni, index) in filterUnits" :key="uni.id">
                            <td class="px-2 py-2 font-medium">{{ index + 1 }}</td>
                            <td class="px-2 py-2 font-medium">{{ uni.unit_name }}</td>
                            <td class="px-2 py-2 font-medium">{{ getAddedBy(uni) }}</td>
                            <td class="px-2 py-2 font-medium">{{ formatDateOnly(uni.createdAt || uni.created_at || uni.addedDate) }}</td>
                            <td class="px-5 py-2 text-gray-600">
                                <div class="flex items-center">
                                    <button @click="editUnit(uni)"  aria-label="Edit unit" class="flex items-center justify-center h-7 w-7 rounded-sm bg-green-600 text-white cursor-pointer hover:bg-green-700">
                                        <SquarePenIcon w-4 h-4/>
                                    </button>
                                    <button @click="confirmDelete(uni)" aria-label="delete Unit" class="flex items-center just-fy-center h-7 w-7 rounded-sm bg-red-600 text-white cursor-pointer hover:bg-red-700">
                                        <Trash2 class="w-4 h-4"/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        //registration modal or edit modal
        <div v-if="showModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-xl shadow-sm max-w-2xl max-h-[90vh] overflow-y-auto w-full">
                <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 class="text-xl font-medium text-gray-800">
                        {{ isEditingForm? 'Edit Product Unit': 'New Product Unit' }}
                    </h2>
                    <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
                        <X class="w-4 h-4"/>
                    </button>
                </div>
                <form  @submit.prevent="saveUnit" class="p-6 space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-1 gap-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Unit Name</label>
                            <input type="text" v-model="form.unit_name" required class="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-green-500 outline-none" placeholder="enter unit">
                        </div>
                    </div>
                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button type="button" @click="closeModal" class="px-4 py-2 border border-gray-300 text-white rounded-sm font-medium bg-gray-500  hover:bg-gray-500 text-sm">
                            Cancel
                        </button>
                        <button type="submit" :disabled="saving" class=" flex items-center gap-2 px-4 py-2 border border-gray-300 text-white bg-red-700 rounded-sm font-medium  hover:red-500 text-sm gap-2">
                            <CircleCheckIcon class="w-4 h-4"/>{{ saving?'Saving...':(isEditingForm? 'Submit':'Submit') }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        //delete modal
        <div class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center p-4 justify-center" v-if="showDeleteModal">
            <div class="shadow-xl rounded-xl max-w-2xl w-full bg-white ">
                <div class="p-6">
                    <h2 class="text-lg font-medium text-gray-800">Delete Product Unit</h2>
                    <p class="mt-2 text-sm text-gray-500">
                        Are you sure you want to delete<span class="font-semibold text-gray-800">{{ unitToDelete?.unit_name }}</span>? This action can not be undone
                    </p>
                </div>
                <div class="flex justify-end gap-3 border-t border-gray-300">
                    <button @click="cancelDelete" class="cursor-pointer px-4 py-2 border border-gray-300 text-gray-400text-sm bd-gray-500">
                        Cancel
                    </button>
                    <button  @click="deleteUnit" class="cursor-pointer text-sm px-4 py-2 bg-red-500 rounded-sm flex items-center gap-2 " :disabled="deleting"></button>
                </div>
            </div>
        </div>
    </div>
</template>
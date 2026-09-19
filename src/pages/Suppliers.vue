<script setup>
import {ref, reactive, onMounted, computed, watch} from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { CircleCheck,  Download,  Plus, SquarePenIcon, Trash2, Upload, X , Search, UploadIcon} from 'lucide-vue-next';

const suppliers=ref([]);
const loading=ref(false);
const showModal=ref(false);
const editingId=ref(null);
const isEditingForm=ref(false);
const supplierToDelete=ref(null);
const showDeleteModal=ref(false);
const deleting=ref(false);
const saving=ref(false);
const loggedUser=ref(null);

//pagination state
const currentPage=ref(1);
const pageSize=ref(10);//show 10 entries
const pageSizeOptions=[10,50,100,150,200];

//search state
const searchQuery=ref('');



//import modal state
const showImportModal=ref(false);
const selectedFile=ref(null);
const importing=ref(false);
const fileInput=ref(null);


try{
    loggedUser.value=JSON.parse(localStorage.getItem('user') || 'null');
}catch{
    loggedUser.value=null;
}
//pagination functions 
const totalPages=computed(()=>{
    return Math.ceil(filteredSuppliers.value.length / pageSize.value ) || 1;//updated to filtered suppliers
});

const paginatedSuppliers=computed(()=>{// slice of the suppliers array
    const start= (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredSuppliers.value.slice(start, end);//updated to search from filteredsupps instead of suppliers array.
});

//reset page whenever the pagesize or data length changes
watch([pageSize, searchQuery, ()=> suppliers.value.length],()=>{//also when the search query changes.
    currentPage.value=1;
});


//page navigation functions
function goToPage(page){
    if(page < 1 || page > totalPages.value) return;
    currentPage.value= page;
}
function nextPage(){
    goToPage(currentPage.value + 1);
}
function prevPage(){
    goToPage(currentPage.value -1);
}

// list of page numbers to render as buttons, e.g. [1,2,3,4]
const visiblePageNumbers=computed(()=>{
    const pages=[];
    for(let i=1;i<=totalPages.value;i++){
        pages.push(i);
    }
    return pages;
});





onMounted(async()=>{
    await fetchSuppliers();
});

async function fetchSuppliers(){
    loading.value=true;
    try{
        const {data}=await api.get('/suppliers');
        suppliers.value=data.map(supplier => ({
            ...supplier,
            contact: String(supplier.contact ?? ''),
        }));
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

function editSupplier(sup){
    form.name=sup.name;
    form.contact=String(sup.contact ?? '');
    form.address=sup.address;

    isEditingForm.value=true;
    editingId.value=sup.id;
    showModal.value=true;
}

function closeModal(){
    showModal.value=false;
    resetForm();
}

function confirmDelete(sup){
    supplierToDelete.value=sup;
    showDeleteModal.value=true;
}

function cancelDelete(){
    showDeleteModal.value=false;
    supplierToDelete.value=null;
}

async function deleteSupplier(){
    if(!supplierToDelete.value) return;
    deleting.value=true;

    try{
        await api.delete(`/suppliers/${supplierToDelete.value.id}`);
        suppliers.value=suppliers.value.filter(s => s.id !== supplierToDelete.value.id);
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
        contact:String(form.contact),
        address:form.address
    }
    saving.value=true;

    try{    
        if(isEditingForm.value){
            const {data}= await api.put(`/suppliers/${editingId.value}`,payload);
            const index= suppliers.value.findIndex(s=>s.id===editingId.value);
            if(index!==-1){
                suppliers.value[index]=data;
            }
            toast.success('System supplier updated successfully');
        }else{
            const {data}= await api.post('/suppliers',payload);
            suppliers.value.unshift(data);
            toast.success('System Supplier registered successfully');
        }
        closeModal();
    }catch(error){
        console.error('Failed to save system suppliers ',error);
        toast.error('Failed to save system suppliers.');
    }finally{
        saving.value=false;
    }
}

async function exportSuppliers(){
    try{
        const response = await api.get('/suppliers/export', { responseType: 'blob' });
        downloadFile(response.data, 'suppliers.xlsx');
    }catch(error){
        console.error('Failed to export suppliers', error);
        toast.error('Failed to export suppliers.');
    }
}

async function downloadTemplate(){
    try{
        const response = await api.get('/suppliers/template', { responseType: 'blob' });
        downloadFile(response.data, 'supplier-template.xlsx');
    }catch(error){
        console.error('Failed to download template', error);
        toast.error('Failed to download template.');
    }
}

// Shared helper: takes the raw file data and makes the browser save it
function downloadFile(blobData, filename){
    const blob = new Blob([blobData], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
}
//import modal functions
function openImportModal(){
    showImportModal.value=true;
    selectedFile.value=null;
}
function closeImportModal(){
    showImportModal.value=false;
    selectedFile.value=null;
}
function triggerFileSelect(){
    if(fileInput.value){
        fileInput.value.click();
    }
}

async function handleFileSelected(event){
    const file = event.target.files[0];
    if(!file) return;

    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`;
    if(!allowedExtensions.includes(fileExtension)){
        toast.error('Please select an Excel or CSV file.');
        event.target.value = '';
        selectedFile.value=null;
        return;
    }
    selectedFile.value=file;
    event.target.value='';
}
async function submitImport(){
    if(!selectedFile.value){
        toast.error('Please select a file first');
        return;
    }
    const formData =new FormData();
    formData.append('file',selectedFile.value);

    importing.value=true;
    try{
        await api.post('/suppliers/import',formData);
        toast.success('Suppliers imported sucessfully');
        await fetchSuppliers();
        closeImportModal();
    }catch(error){
        console.error('Failed to import File',error);
        toast.error('Failed to import File');

    }finally{
        importing.value=false;
    }
}  


//search state functionality
const filteredSuppliers=computed(()=>{
    const query= searchQuery.value.trim().toLocaleLowerCase();
    if(!query) return suppliers.value;

    return suppliers.value.filter(s=>(s.name ?? '').toLocaleLowerCase().includes(query) ||
                                    (s.contact ?? '').toLocaleLowerCase().includes(query) || 
                                    (s.address ?? '').toLocaleLowerCase().includes(query));
});
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
            <div class="min-h-0 overflow-hidden flex-1">
                <div class="h-full w-full overflow-auto">
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                        <div class="flex items-center gap-2 text-sm text-gray-600">
                            <span>Show</span>
                            <select v-model="pageSize" class="border border-gray-300 rounded-sm px-2 py-1 text-sm">
                                <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
                            </select>
                            <span>entries</span>
                        </div>
                    <div class="flex items-end justify-end gap-2">
                        <button
                            @click="addNewSupplier"
                            class="mt-2 flex items-center gap-2 rounded-sm bg-green-500 px-2 py-1.5 text-xs text-white cursor-pointer"
                        >
                            <Plus class="h-4 w-4" />
                            New Supplier
                        </button>
                        <div class="flex items-center justify-center gap-2">
                        <button @click="openImportModal" type="button" :disabled="importing"
                            class="mt-2 flex items-center gap-2 rounded-sm border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer">
                            {{ importing ? 'Importing...' : 'Import suppliers' }}
                            <Upload class="w-4 h-4"/>
                        </button>
                         </div>

                        <div class="flex items-center justify-center gap-2">
                        <button @click="exportSuppliers" type="button"
                            class="mt-2 flex items-center gap-2 rounded-sm border border-gray-300 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer">
                            Export
                            <Download class="h-4 w-4" />
                        </button>
                        </div>
                        <div class="flex items-center justify-center gap-2">
                        <button @click="downloadTemplate" type="button"
                            class="mt-2 flex items-center gap-2 rounded-sm border border-gray-300 px-3 py-2.5 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer">
                            <Download class="h-4 w-4 "/>
                            <span class="text-center leading-tight">Download<br>Supplier's Template</span>
                        </button>
                        </div>
                    </div>
                    </div>
                    <!--search filter-->
                    <div class="relative flex-1 min-w-[180px] max-w-xs">
                            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                            <input type="text"
                            v-model="searchQuery"
                            placeholder="search suppliers..."
                            class="w-full border border-gray-300 rounded-sm pl-8 pr-3 py-1.5 text-xs ">
                            <button 
                            v-if="searchQuery"
                            @click="searchQuery=''"
                            type="button"
                            aria-label="Clear Search"
                            class="absolute right-2 -translate-1/2 justify-center top-1/2 flex items-center w-4 h-4 text-gray-400">
                            <X class="w-4 h-4 cursor-pointer"/>
                            </button>
                    </div>
                    <table class="w-full min-w-[560px] mt-2 divide-y divide-slate-200 text-sm text-left">
                        <thead class="sticky z-10 top-0 tracking-wide border-b border-gray-200 text-black">
                            <tr>
                                <td class="px-2 py-2 font-medium">#</td>
                                <td class="px-2 py-2 font-medium">Name</td>
                                <td class="px-2 py-2 font-medium">Contact</td>
                                <td class="px-2 py-2 font-medium">Address</td>
                                <td class="px-2 py-2 font-medium">Actions</td>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200">
                            <tr v-if="loading">
                                <td class="px-4 py-12 text-gray-400 text-center" colspan="5">Loading Suppliers</td>
                            </tr>
                            <tr v-else-if="!suppliers.length">
                                <td class="px-4 py-12 text-gray-400 text-center" colspan="5">No suppliers found</td>
                            </tr>
                            <tr v-else-if="!filteredSuppliers.length" class="flex items-center justify-center mt-5">
                                <td colspan="5" >No suppliers match "{{ searchQuery }}"</td>
                            </tr>
                            <tr v-for="(supp,index) in paginatedSuppliers" :key="supp.id">
                                <td class="px-2 py-2 font-medium">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                                <td class="px-2 py-2 font-medium">{{ supp.name }}</td>
                                <td class="px-2 py-2 font-medium">{{ supp.contact }}</td>
                                <td class="px-2 py-2 font-medium">{{ supp.address }}</td>
                                <td class="px-5 py-2 sm:px-5 text-gray-400">
                                    <div class="flex items-center gap-0">
                                    <button 
                                        @click="editSupplier(supp)"
                                        class="flex items-center justify-center h-7 w-7 rounded-sm bg-green-600 text-white cursor-pointer hover:bg-green-700 ">
                                        <SquarePenIcon class="w-4 h-4"/>
                                    </button>
                                    <button 
                                        @click="confirmDelete(supp)"
                                        class="flex items-center justify-center h-7 w-7 rounded-sm bg-red-600 text-white cursor-pointer hover:bg-red-700">
                                        <Trash2 class="w-4 h-4"/>
                                    </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div class="flex justify-end px-2 py-3 text-sm text-gray-600">
                        <div class="flex items-center gap-2">
                            <span>
                                <!-- Page {{ currentPage }} of {{ totalPages }} -->
                                <!-- ({{ suppliers.length }} total) -->
                            </span>
                            <<   <<
                            <button
                                v-for="page in visiblePageNumbers"
                                :key="page"
                                @click="goToPage(page)"
                                :class="[
                                    'px-2.5 py-1 border rounded-sm text-xs min-w-[28px]',
                                    page === currentPage
                                        ? 'bg-green-600 text-white border-green-600'
                                        : 'border-gray-300 hover:bg-gray-100'
                                ]"
                            >
                                {{ page }}
                            </button>
                            >>    >>
                        </div>
                    </div>
                </div>
            </div>


            <div v-if="showModal" class="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center p-4 justify-center">
                <div class="max-h-[80vh] max-w-2xl overflow-y-auto bg-white w-full rounded-lg shadow-sm">
                    <div class="flex items-center justify-between border-b border-gray-400 p-4 sm:p-6">
                        <h2 class="font-medium text-sm text-gray-600 sm:text-xl">
                            {{ isEditingForm ? 'Edit System Supplier' : 'New Supplier'}}
                        </h2>
                        <button @click="closeModal" class="text-gray-400">
                                <X class="w-4 h-4"/>
                        </button>
                    </div>
                    <form @submit.prevent="saveSupplier" class="space-y-4 p-4 sm:p-6">
                        <div class="grid grid-cols-1 sm:grid-cols-1 gap-4">
                            <label class="block text-xs font-medium text-gray-700 mb-1">Name</label>
                            <input type="text" v-model="form.name" class="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-green-500 outline-none">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-1 gap-4">
                            <label class="block text-xs font-medium text-gray-700 mb-1">Contact</label>
                            <input type="tel" inputmode="numeric" v-model="form.contact" class="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-green-500 outline-none">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-1 gap-4">
                            <label class="block text-xs font-medium text-gray-700 mb-1">Address</label>
                            <input type="text" v-model="form.address" class="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-green-500 outline-none">
                        </div>
                        <div class="flex flex-col-reverse justify-end gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center">
                            <button @click="closeModal" type="button" class="w-full rounded-sm border border-gray-300 bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 sm:w-auto">
                                Cancel
                            </button>
                            <button type="submit" :disabled="saving" class="flex w-full items-center justify-center gap-2 rounded-sm border border-gray-300 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 sm:w-auto">
                                <CircleCheck class="h-4 w-4 shrink-0" aria-hidden="true" />
                                {{ saving ? 'Saving...': (isEditingForm? 'Update':'Submit') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div v-if="showDeleteModal" class="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center p-4 justify-center">
                <div class="max-w-2xl w-full bg-white rounded-lg shadow-sm p-6">
                    <h2 class="font-medium text-lg">Delete System Supplier</h2>
                    <p class="font-medium mt-2 text-gray-400 text-sm mb-4">
                        Are you sure you want to this delete <span class="font-semibold text-gray-800">"{{ supplierToDelete?.name }}"? </span>This cannot be undone.
                    </p>
                    <div class="flex justify-end gap-3">
                        <button @click="cancelDelete" type="button" class="rounded-sm border border-gray-300 bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600">
                            Cancel
                        </button>
                        <button @click="deleteSupplier" :disabled="deleting" type="button" class="flex items-center justify-center gap-0 rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 ">
                         <CircleCheck class="w-4 h-4 "/>   {{ deleting ? 'Deleting...' : 'Yes' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- import modal-->
             <div v-if="showImportModal" class="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center p-4 justify-center">
                <div class="max-w-md w-full bg-white rounded-lg shadow-sm p-4 sm:p-6">
                    <div class="flex items-center justify-between border-b border-gray-400 p-4 sm:p-6">
                        <h2 class="font-medium text-sm text-gray-600">
                            Import Suppliers
                        </h2>
                        <button @click="closeImportModal" type="button" class="text-gray-400 hover:text-gray-600">
                            <X class="w-4 h-4"/>
                        </button>
                    </div>
                    <div class="space-y-4">
                        <div class="flex flex-col items-center justify-center border-2 border-gray-400 rounded-lg p-6">
                            <UploadIcon class="w-4 h-4"/>
                            <p class="text-xs text-gray-600 mb-2">Select an EXcel(.xlsx, xls) or CSV file</p>
                        </div>
                        <button type="button"
                        @click="triggerFileSelect"
                        class="px-3 py-1.5 bg-gray-200 rounded-md text-xs font-medium text-gray-700 cursor pointer">
                        Choose File
                        </button>
                        <input type="file"
                        ref="fileInput"
                        accept=".xlsx, .xls,.CSV"
                        class="hidden"
                        @change="handleFileSelected">
                        <p v-if="selectedFile" 
                        class="mt-3 text-xs font-semibold text-green-600 truncate max-w-full">
                        Selected: {{ selectedFile.name }}</p>
                    </div>
                    <div class="flex justify-end gap-3 border-t border-gray-300 pt-4">
                        <button @click="closeImportModal"
                        type="button"
                        class="rounded-sm border border-gray-300 bg-gray-500 px-4 py-2 text-sm font-medium text-white cursor-pointer" 
                        >Cancel</button>
                        <button @click="submitImport" :disabled="importing || !selectedFile"
                        type="button"
                        class="rounded-sm bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
                        {{ importing ? 'Importing...' : 'Import' }}
                        </button>
                    </div>
                </div>
             </div>
        </div>
    </div>
</template>
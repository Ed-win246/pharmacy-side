<script setup>
import { onMounted, reactive, ref } from 'vue';
import { Pencil, Plus, Trash2, X } from 'lucide-vue-next';
import toast from '@tsirosgeorge/toastnotification';
import api from '@/lib/api';

const categories = ref([]);
const loading = ref(true);
const saving = ref(false);
const showModal = ref(false);
const editingId = ref(null);
const isEditingForm=ref(false);
const categoryToDelete=ref(null);
const showDeletModal=ref(false);
const deleting=ref(false);
const loggedUser = ref(null);

try {
    loggedUser.value = JSON.parse(localStorage.getItem('user') || 'null');
} catch {
    loggedUser.value = null;
}

onMounted(async()=>{
    await fetchCategories();
});

async function fetchCategories(){
    loading.value=true;
    try{
        const {data} = await api.get('/categories');
        categories.value=data;
    }catch(error){
        console.error('Error fecthing categories', error);
        toast.error('Failed to fetch categories. Please try again later');
    }finally{
        loading.value=false;
    }
}

const form = reactive({
    name: '',
});

function resetForm(){
    form.name='';
}

function addNewCategory(){
    resetForm();
    editingId.value=null;
    isEditingForm.value=false;
    showModal.value=true;
}
function editCategory(category){
    form.name= category.name || '';

    editingId.value=category.id;
    isEditingForm.value=true;
    showModal.value=true;
}

function confirmDelete(cat){
    categoryToDelete.value=cat;
    showDeletModal.value=true;
}

function cancelDelete(){
    showDeletModal.value=false;
    categoryToDelete.value=null;
}


async function deleteCategory(){
    if(!categoryToDelete.value) return;
    deleting.value=true;
    try{
        await api.delete(`/categories/${categoryToDelete.value.id}`);
        categories.value= categories.value.filter()
    }catch(error){
        console.error('Error deleting category.', error);
        toast.error('Category couldnlt be deleted.');
    }finally{
        deleting.value=false;
    }
}

function getAddedBy(category) {
    return category.addedBy?.name
        || category.addedBy?.email
        || category.addedByName
        || category.createdBy?.name
        || category.createdBy?.email
        || loggedUser.value?.name
        || loggedUser.value?.email
        || 'Not available';
}


</script>

<template>
    <div class="h-full max-w-7xl mx-auto flex flex-col space-y-6 overflow-hidden">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-xl font-medium tracking-wide text-gray-800">Product Categories</h2>
                <p class="text-sm text-gray-500">Manage the categories used for your products</p>
            </div>
            <button
                @click="addNewCategory"
                class="flex items-center gap-2  bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700 cursor-pointer"
            >
                <Plus class="h-4 w-4" />
                New Category
            </button>
        </div>

        <div class="min-h-0 flex-1 bg-white shahow-sm overflow-hidden">
            <div class="h-full overflow-auto">
                <table class="w-[90%] min-w-[620px] text-sm text-left text-black divide-y divide-slate-100">
                    <thead class="sticky top-0 z-10 border-b bd-white text-xs tracking-wide text-black">
                        <tr>
                            <th class="px-4 py-4 font-medium">#</th>
                            <th class="px-4 py-4 font-medium ">Name</th>
                            <th class="px-4 py-4 font-medium">Added-by</th>
                            <th class="px-4 py-4 font-medium">Added-on</th>
                            <th class="px-4 py-4 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr v-if="loading">
                            <td class="py-12 px-6 text-center text-gray-500" colspan="5">
                                No Data Found...
                            </td>
                        </tr>
                        <tr v-else-if="categories.length===0">
                            <td class="px-6 py-12 text-center text-gray-500" colspan="5">
                                No Product Categories added Yet. Click " New Category " to create one.
                            </td>
                        </tr>
                        <tr v-for="(cat,index) in categories" :key="cat.id">
                            <td class="px-4 py-4 font-medium ">{{ index + 1 }}</td>
                            <td class="px-4 py-4 font medium">{{ cat.name }}</td>
                            <td class="px-4 py-4 text-gray-600">{{ getAddedBy(cat) }}</td>
                            <td class="px-4 py-4 text-gray-600">{{ cat.createdAt || cat.created_at || cat.addedDate || 'Not available' }}</td>
                            <td class="px-4 py-4 text-gray-600">
                                <button @click="editCategory(cat)">
                                    <Pencil class="w-4 h-4"/>
                                </button>
                                <button @click="confirmDelete(cat)">
                                    <Trash2 class="w-4 h-4"/>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

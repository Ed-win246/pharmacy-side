<script setup>
import { onMounted, reactive, ref , computed } from 'vue';
import { Plus, Trash2, X, SquarePenIcon, CircleCheckIcon , Search} from 'lucide-vue-next';
import toast from '@tsirosgeorge/toastnotification';
import api from '@/lib/api';


const categories = ref([]);
const loading = ref(true);
const saving = ref(false);
const showModal = ref(false);
const editingId = ref(null);
const isEditingForm=ref(false);
const categoryToDelete=ref(null);
const showDeleteModal=ref(false);
const deleting=ref(false);
const loggedUser = ref(null);
const searchQuery=ref('');

//search function
const filterCategories=computed(()=>{
    if(!searchQuery.value.trim()){
        return categories.value;
    }
    const query= searchQuery.value.trim().toLowerCase();
    return categories.value.filter(cat=>
        String(cat.Category_name || '').toLowerCase().includes(query)
    );
});

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
    Category_name: '',
});
 

function resetForm(){
    form.Category_name='';
}

function addNewCategory(){
    resetForm();
    editingId.value=null;
    isEditingForm.value=false;
    showModal.value=true;
}
function editCategory(category){
    form.Category_name= category.Category_name || '';

    editingId.value=category.id;
    isEditingForm.value=true;
    showModal.value=true;
}

function closeModal(){
    showModal.value=false;
    resetForm();
}

function confirmDelete(cat){
    categoryToDelete.value=cat;
    showDeleteModal.value=true;
}

function cancelDelete(){
    showDeleteModal.value=false;
    categoryToDelete.value=null;
}


async function deleteCategory(){
    if(!categoryToDelete.value) return;
    deleting.value=true;
    try{
        await api.delete(`/categories/${categoryToDelete.value.id}`);
        categories.value= categories.value.filter(c =>c.id !==categoryToDelete.value.id);
        showDeleteModal.value=false;
        categoryToDelete.value=null;
        toast.success('Product category deleted successfully');
    }catch(error){
        console.error('Error deleting category.', error);
        toast.error('Category couldnot be deleted.');
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

function formatDateOnly(value) {
    if (!value) return 'Not available';
    return String(value).split(/[T ]/)[0];
}

async function saveCategory(){
    if(!form.Category_name){
        alert('Please fill in required fields: Name');
        return;
    }

    const payload={
        Category_name: form.Category_name
    }

    saving.value=true;
    try{
        if(isEditingForm.value){
            const {data}= await api.put(`/categories/${editingId.value}`,payload);
            const index = categories.value.findIndex(c => c.id===editingId.value);
            if(index !==-1){
                categories.value[index]=data;
            }
            toast.success('Product Category updated successfully');
        }else{
            const{data}= await api.post('/categories',payload);
            categories.value.unshift(data);
            toast.success('Product Category registered successfully');
        }
        closeModal();
    }catch(error){
        console.error('Error saving product category',error);
        toast.error('Failed to save product category. Please try again.');
    }finally{
        saving.value=false;
    }
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
        <div class="relative max-w-sm pl-2 ">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                v-model="searchQuery"
                type="text"
                placeholder="Search product category..."
                class="w-full pl-9 pr-9 py-2 border border-gray-400 rounded-sm text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
            <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                type="button"
                aria-label="Clear search"
                class="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-gray-400 hover:text-gray-600"
            >
                <X class="h-4 w-4" />
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
                                No Product Category Data Found...
                            </td>
                        </tr>
                        <tr v-else-if="filterCategories.length===0">
                            <td class="px-6 py-12 text-center text-gray-500" colspan="5">
                               {{ searchQuery ? 'No product category matches your search':'No product categorry found' }}
                            </td>
                        </tr>
                        <tr v-for="(cat,index) in filterCategories" :key="cat.id">
                            <td class="px-2 py-2 font-medium ">{{ index + 1 }}</td>
                            <td class="px-2 py-2 font medium">{{ cat.Category_name }}</td>
                            <td class="px-4 py-2 text-gray-600">{{ getAddedBy(cat) }}</td>
                            <td class="px-2 py-2 text-gray-600">{{ formatDateOnly(cat.createdAt || cat.created_at || cat.addedDate) }}</td>
                            <td class="px-5 py-2 text-gray-600">
                                <div class="flex items-center">
                                <button @click="editCategory(cat)" aria-label="Edit category" class="flex h-7 w-7 items-center justify-center rounded-l-sm bg-green-600 text-white cursor-pointer hover:bg-green-700">
                                    <SquarePenIcon class="w-4 h-4"/>
                                </button>
                                <button @click="confirmDelete(cat)" aria-label="Delete category" class="flex h-7 w-7 items-center justify-center rounded-r-sm bg-red-600 text-white cursor-pointer hover:bg-red-700" >
                                    <Trash2 class="w-4 h-4"/>
                                </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <!-- registration modal / edit modal -->
        <div v-if="showModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 class="text-xl font-medium text-gray-800">
                        {{ isEditingForm? 'Edit Product Category': 'New Product Category' }}
                    </h2>
                    <button @click="closeModal" class="text=gray-400 hover:text-gray-600" >
                        <X class="w-4 h-4"/>
                    </button>
                </div>
                <form @submit.prevent="saveCategory" class="p-6 space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-1 gap-4">
                        <div>
                            <label  class="block text-xs font-semibold text-gray-700 mb-1">Category Name</label>
                            <input v-model="form.Category_name" type="text" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-green-500 outline-none" placeholder="e.g. tablets">
                        </div>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button type="button" @click="closeModal" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-sm text-sm hover:bg-gray-50 ">
                            Cancel
                        </button>
                        <button type="submit" :disabled="saving" class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium disabled:opacity-50 rounded-sm ">
                            <CircleCheckIcon class="w-4 h-4"/>  {{ saving ? 'Saving...' : (isEditingForm ? 'Submit' : 'Submit')}}

                        </button>
                    </div>
                </form>
            </div>
        </div>
        <!--delete modal-->
        <div v-if="showDeleteModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center p-4 z-50 justify-center">
            <div class="shodow-xl rounded-xl max-w-2xl w-full bg-white ">
                <div class="p-6">
                    <h2 class="text-lg font-semibold text-gray-800">Delete Product Category</h2>
                    <p class="mt-2 text-sm text-gray-500">
                        Are you sure you want to delete <span class="font-semibold text-gray-700">{{ categoryToDelete?.Category_name }}</span>? This action cannot be undone
                    </p>
                </div>
                <div class="flex justify-end gap-3 p-4 border-t border-gray-300">
                    <button @click="cancelDelete" class="cursor-pointer px-4 py-2 border border-gray-300text-gray-400 text-sm rounded-sm bg-gray-500">
                        Cancel
                    </button>
                    <button @click="deleteCategory" :disabled="deleting" class="cursor-pointer px-4 py-2 bg-red-500 text-white rounded-sm text-sm font-medium flex items-center gap-2 ">
                      <CircleCheckIcon class="w-4 h-4"/>  {{ deleting? 'Deleting...' : 'Yes' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

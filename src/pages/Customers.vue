<script setup>
import {ref, reactive, onMounted} from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import {  CircleCheck, Plus, SquarePen, Trash2 ,X} from 'lucide-vue-next';


const customers = ref([])
const saving = ref(false)
const loading = ref(false)
const customerToDelete = ref(null)
const showDeleteModal = ref(false)
const deleting = ref(false)
const editingId = ref(null)
const showModal = ref(false)
const isEditingForm = ref(false)
const loggedUser = ref(null)

try{
    loggedUser.value=JSON.parse(localStorage.getItem('user') || 'null');
}catch{
    loggedUser.value=null;
}
onMounted(fetchCustomers);

async function fetchCustomers(){
    if(!customers.value) return;

    loading.value = true;
    try{
        const {data} =  await api.get('/customers');
        customers.value = data;
    }catch(error){
        console.error('Failed to load customers',error);
        toast.error('Failed to load system customers');
    }finally{
        loading.value = false;
    }
}

const form = reactive({
    name:'',
    email:'',
    contact:'',
    location:'',
})

function resetForm(){
    form.name = '';
    form.email = '';
    form.contact = '';
    form.location = '';
}

function addNewCustomer(){
    resetForm();
    editingId.value = null;
    showModal.value = true;
    isEditingForm.value = false;
}
function editCustomer(customer){
    form.name = customer.name;
    form.email = customer.email;
    form.contact = customer.contact;
    form.location = customer.location;

    editingId.value = customer.id;
    isEditingForm.value = true;
    showModal.value = true;
}

function closeModal(){
    showModal.value = false;
    resetForm();
}

function confirmDelete(cust){
    customerToDelete.value = cust;
    showDeleteModal.value = true;
}

async function saveCustomer(){
    if(!form.name || !form.email || !form.contact || !form.location){
        alert('Fill in all the feilds');
        return;
    }
    const payLoad={
        name:form.name,
        email:form.email,
        contact:String(form.contact??''),
        location:form.location,
    }
     
    saving.value = true;
    try{
        if(isEditingForm.value){
            const {data} = await api.put(`/customers/${editingId.value}`,payLoad);
            const index = customers.value.findIndex(c=>String(c.id) === String(editingId.value));
            if(index !== -1){
                customers.value[index] = {
                    ...customers.value[index],
                    ...payLoad,
                    ...(data?.customer ?? data?.data?.customer ?? {}),
                };
            }
            toast.success('Customer info updated successfully');
        }else{
            const {data} = await api.post('/customers',payLoad);
            customers.value.unshift(data);
            toast.success('Customer registered successfully');
        }
        closeModal();
    }catch(error){
        console.error('Fialed to save system customers',error);
        toast.error('Failed to save customers');
    }finally{
        saving.value = false;
    }
}
function getAddedBy(customer){
    return customer.addedBy?.name
    || customer.addedBy?.email
    || customer.addedByname
    || customer.createdBy?.name
    || customer.createdBy?.email
    || loggedUser.value?.name
    || loggedUser.value?.email
    || 'Not available';
}
function formatDateOnly(value){
    if(!value) return 'Not available';
    return String(value).split(/[T]/)[0];
}

async function deleteCustomer(){
    if(!customerToDelete.value) return;
    deleting.value = true;

    try{
        const deletedCustomerId = customerToDelete.value.id;
        await api.delete(`/customers/${deletedCustomerId}`);
        customers.value = customers.value.filter(
            (customer) => String(customer.id) !== String(deletedCustomerId),
        );
        showDeleteModal.value = false;
        customerToDelete.value = null;
        toast.success('Customer deleted successfully');
    }catch(error){
        console.error('Failed to delete customer',error);
        toast.error('Failed to delete customer');
    }finally{
        deleting.value = false;
    }
}

function cancelDelete(){
    showDeleteModal.value = false;
    customerToDelete.value = null;
}
</script>
<template>
    <div class="min-h-screen w-full">
        <div class=" h-full max-auto flex flex-col  pb-10 p-2">
            <div class="flex items-center justify-between p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">View Customers</h2>
                </div>
                    <div class="font-medium text-sm">
                        <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                        <span class="text-gray-400">/ Customers</span>
                    </div>
            </div>

            <div class="bg-white shadow-sm rounded-sm mt-2">
                <div class="flex items-center justify-end p-4">
                    <button @click="addNewCustomer"
                    class="text-xs rounded-sm gap-2 font-medium border border-gray-200 bg-green-600 px-4 py-1.5 flex items-center justify-center text-white cursor-pointer">
                        <Plus class="w-4 h-4 "/>New Customer
                    </button>
                </div>
                <table class="w-full text-sm text-left">
                    <thead class="border-b border-gray-200 tracking-wide text-xs">
                        <tr>
                            <th class="px-4 py-3 font-medium">#</th>
                            <th class="px-4 py-3 font-medium">Full Name</th>
                            <th class="px-4 py-3 font-medium">Tel.Contact</th>
                            <th class="px-4 py-3 font-medium">Email</th>
                            <th class="px-4 py-3 font-medium">Location</th>
                            <th class="px-4 py-3 font-medium">Added by</th>
                            <th class="px-4 py-3 font-medium">Since</th>
                            <th class="px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 ">
                        <tr v-if="loading">
                            <td class="px-4 py-12 text-center text-xs text-gray-400" colspan="7">
                                Loading customer info...
                            </td>
                        </tr>
                        <tr v-else-if="customers.length === 0">
                            <td class="px-4 py-12 text-center text-xs text-gray-400" colspan="7">
                                No customer info found...
                            </td>
                        </tr>
                        <tr v-for="(cu ,index) in customers" :key="cu.id" class="text-xs">
                            <td class="px-4 py-3 font-medium">{{ index + 1 }}</td>
                            <td class="px-4 py-3 font-medium">{{ cu.name }}</td>
                            <td class="px-4 py-3 font-medium">{{ cu.contact }}</td>
                            <td class="px-4 py-3 font-medium">{{ cu.email }}</td>
                            <td class="px-4 py-3 font-medium">{{ cu.location }}</td>
                            <td class="px-4 py-3 font-medium">{{ getAddedBy(cu) }}</td>
                            <td class="px-4 py-3 font-medium">{{ formatDateOnly(cu.createdAt || cu.created_at || cu.addedDate) }}</td>
                            <td class="px-4 py-3">
                                <div class="flex items-center">
                                    <button @click="editCustomer(cu)"
                                        type="button"
                                        class="flex items-center justify-center w-7 h-7 rounded-sm bg-green-500 cursor-pointer text-white">
                                        <SquarePen class="w-4 h-4"/>
                                    </button>
                                    <button @click="confirmDelete(cu)"
                                        type="button"
                                        class="flex items-center justify-center w-7 h-7 rounded-sm bg-red-500 cursor-pointer text-white">
                                        <Trash2 class="w-4 h-4"/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!--edit and register modal-->
            <div v-if="showModal" class="fixed inset-0 z-50 backdrop-md bg-black/50 flex items-center justify-center p-4">
                <div class="bg-white max-w-xl rounded-sm max-h-[80vh] overflow-y-auto shadow-sm w-full">
                    <div class="flex items-center justify-between p-4  border-b border-gray-200">
                        <h3 class="text-sm font-medium text-gray-800 sm:text-xl">
                            {{ isEditingForm? 'Edit Customer':'New Customer' }}
                        </h3>
                        <button @click="closeModal"
                        type="button"
                        class="text-gray-400 cursor-pointer"><X class="w-4 h-4 "/>
                        </button>
                    </div>
                    <form @submit.prevent="saveCustomer" space-y-4 sm:p-6>
                        <div class="grid grid-cols-1 sm:grid-cols-1 p-4">
                            <div>
                                <label class="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                                <input type="text" v-model="form.name" required class="w-full px-4 py-2 rounded-sm border border-gray-200 placeholder:text-xs text-xs" placeholder="jane doe">
                            </div>
                        </div>
                          <div class="grid grid-cols-1 sm:grid-cols-1 p-4">
                            <div>
                                <label class="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" v-model="form.email" required class="w-full px-4 py-2 rounded-sm border border-gray-200 placeholder:text-xs text-xs" placeholder="jane@gmail.com">
                            </div>
                        </div>
                        <div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                            <div>
                                <label class="block text-xs font-medium text-gray-700 mb-1">Contact</label>
                                <input type="tel" v-model="form.contact" required placeholder="123-456-789" class="w-full px-4 py-2 rounded-sm border border-gray-200 placeholder:text-xs text-xs">
                            </div>
                              
                            <div>
                                <label class="block text-xs font-medium text-gray-700 mb-1">Location</label>
                                <input type="text" v-model="form.location" required class="w-full px-4 py-2 rounded-sm border border-gray-200 placeholder:text-xs text-xs" placeholder="kampala">
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 border-t border-gray-200 p-4 ">
                            <button @click="closeModal"
                            type="button"
                            class=" rounded-sm border border-gray-200 bg-gray-500 cursor-pointer px-4 py-2 flex items-center justify-center text-xs text-white">
                                Cancel
                            </button>
                            <button type="submit" :disabled="saving"
                            class="rounded-sm border border-gray-200 gap-2 flex items-center justify-center px-4 py-2 bg-green-600 text-xs text-white  ">
                             <CircleCheck class="w-4 h-4"/>{{ saving ?'Saving...' :(isEditingForm? 'Submit':'Yes') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!--delete modal-->
            <div
                v-if="showDeleteModal && customerToDelete"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-md"
                @click.self="cancelDelete"
            >
                <div
                    class="w-full max-w-2xl rounded-sm bg-white shadow-lg"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-customer-title"
                >
                    <div class="flex items-center justify-between border-b border-gray-200 p-4">
                        <h3 id="delete-customer-title" class="font-medium text-lg">
                            Delete Customer
                        </h3>
                        <button
                            type="button"
                            @click="cancelDelete"
                            :disabled="deleting"
                            aria-label="Close delete confirmation"
                            class="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        >
                            <X class="h-4 w-4" />
                        </button>
                    </div>
                    <p class="p-4 text-xs text-gray-600">
                        Are you sure you want to delete this Customer 
                        <span class="font-semibold text-gray-800 text-xl">{{ customerToDelete.name }}</span>?
                        This action cannot be undone.
                    </p>
                    <div class="flex justify-end gap-2 border-t border-gray-200 p-4">
                        <button
                            type="button"
                            @click="cancelDelete"
                            :disabled="deleting"
                            class="cursor-pointer rounded-sm border border-gray-300 bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            @click="deleteCustomer"
                            :disabled="deleting"
                            class="cursor-pointer rounded-sm bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-cneter justify-center gap-2"
                        >
                            <CircleCheck class="h-4 w-4" />
                         {{ deleting ? 'Deleting...' : 'Yes' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
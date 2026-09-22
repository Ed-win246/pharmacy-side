<script setup>
import {ref, onMounted,reactive, computed} from 'vue'
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import {X, Plus, Trash2, SquarePenIcon, LockKeyhole, Check, CheckCheckIcon, CircleCheck, Search} from 'lucide-vue-next';


const paymentOptions=ref([]);
const loading=ref(false);
const deleting=ref(false);
const settingDefaultId = ref(null);
const editingId=ref(null);
const showModal=ref(false);
const optionToDelete=ref(null);
const saving=ref(false);
const isEditingForm=ref(false);
const showDeleteModal=ref(false);
const loggedUser=ref(null);

//search state
const searchQuery=ref('');

try{
    loggedUser.value=JSON.parse(localStorage.getItem('user') || 'null');
}catch{
    loggedUser.value=null;
}



onMounted(async()=>{
    await fetchpaymentOptions();
});

async function fetchpaymentOptions(){
    loading.value=true;
    try{
        const {data}= await api.get('/paymentOptions');
        paymentOptions.value=data;
    }catch(error){
        console.error('Error fetching payment options', error);
        toast.error('Error fetching payment options');
    }finally{
        loading.value=false;
    }
}


//setdefault functionality.
async function setDefault(option){
    if(option.is_default) return;

    settingDefaultId.value=true;
    try{
        await api.post(`/paymentOptions/${option.id}/set-default`);

        paymentOptions.value=paymentOptions.value.map(o=>({
            ...o,
            is_default:o.id===option.id,
        }));
        toast.success(`"${option.name}" set as default`);

    }catch(error){
        toast.error('Failed to update default payment option.');
    }finally{
        settingDefaultId.value=null;
    }
}

const form=reactive({
    name:'',
    account_number:''
});

function resetForm(){
    form.name='',
    form.account_number=''
}

function addPayment(){
    resetForm();
    showModal.value=true;
    isEditingForm.value=false;
    editingId.value=null;
}

function editPayment(payment){
    form.name=payment.name;
    form.account_number=payment.account_number;

    editingId.value=payment.id;
    isEditingForm.value=true;
    showModal.value=true;
}

function closeModal(){
    showModal.value=false;
    resetForm();
}

function confirmDelete(payopt){
    optionToDelete.value=payopt;
    showDeleteModal.value=true;
}

function cancelDelete(payopt){
    showDeleteModal.value=false;
    optionToDelete.value=null;
}


async function saveOption(){
    if(!form.name || !form.account_number){
        alert('Please fill in these fields.');
        return;
    }
    const payload={
        name:form.name,
        account_number:form.account_number,
    }
    saving.value=true;
    try{
        if(isEditingForm.value){
            const {data}=await api.put(`/paymentOptions/${editingId.value}`, payload);
            const index= paymentOptions.value.findIndex(p=>p.id===editingId.value);

            if(index!==-1){
                paymentOptions.value[index]=data;
            }
            toast.success('Payment Option updated successfully');
        }else{
            const {data}= await api.post('/paymentOptions',payload);
            paymentOptions.value.unshift(data);
            toast.success('Payment Option registered successfully');
        }

        resetForm();
        showModal.value=false;
        isEditingForm.value=false;
        editingId.value=null;
    }catch(error){
        console.error('failed to save payment option',error);
        toast.error('Failed to save payment option');
    }finally{
        saving.value=false;
    }
}

async function deletePayment(){
    if(!optionToDelete.value) return;
    deleting.value=true;

    try{
        await api.delete(`/paymentOptions/${optionToDelete.value.id}`);
        paymentOptions.value=paymentOptions.value.filter(p =>p.id !== optionToDelete.value.id);
        showDeleteModal.value=false;
        optionToDelete.value=null;
        toast.success('Payment option deleted successfully');
    }catch(error){
        console.error('Failed to delete payment option',error);
        toast.error('Failed to delete payment option');
    }finally{
        deleting.value=false;
    }
}

//search functionality
const filteredPayments=computed(()=>{
    const query=searchQuery.value.trim().toLocaleLowerCase();
    if(!query) return paymentOptions.value;

    return paymentOptions.value.filter(p=>
                                        (p.name ?? '').toLocaleLowerCase().includes(query) || 
                                        (p.account_number ?? '').toLocaleLowerCase().includes(query));
});
</script>
<template>
    <div class="min-h-screen w-full">
          <div class="h-full max-w-7xl max-auto flex-col overflow-y-auto pb-5 p-2 ">
                <div class="flex items-center justify-between  px-2 py-1">
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
                <div class="relative flex-1 min-w-[180px] max-w-xs z-20">
                    <Search class="absolute -translate-y-1/2 left-2.5 w-4 h-4 text-gray-400 top-1/2"/>
                    <input type="text"
                    v-model="searchQuery"
                    placeholder="Seach payment options..."
                    class="text-xs w-full border-gray-400 border rounded-sm pl-8 pr-3 py-1.5"
                    >
                    <button type="button"
                    v-if="searchQuery"
                    @click="searchQuery=''"
                    class="right-2 absolute -translate-y-1/2 w-4 h-4 flex items-center text-gray-400 justify-center top-1/2">
                    <x class="w-4 h-4 cursor-pointer"/>
                    </button>
                </div>

                <div class="min-h-0 overflow-hidden flex-1">
                    <div class="h-full overflow-auto w-full">
                        <div class="flex items-center justify-end gap-2 p-4">
                            <button @click="addPayment"
                            class="mt-2 flex items-center rounded-sm bg-green-500 text-xs px-2 py-1.5 text-white cursor-pointer ">
                            <Plus class="w-4 h-4"/>New Option</button>
                        </div>
                        <table class="w-full min-w-[560px] divide-y divide-slate-100 mt-2 text-left text-sm">
                            <thead class="sticky top-0 z-10 border-b border-gray-400 text-black tracking-wide">
                                <tr>
                                    <th scope="col" class="px-2 py-2 text-left font-medium">#</th>
                                    <th scope="col" class="px-2 py-2 text-left font-medium">Name</th>
                                    <th scope="col" class="px-2 py-2 text-left font-medium">Account Number</th>
                                    <th scope="col" class="px-2 py-2 text-left font-medium">Default</th>
                                    <th scope="col" class="px-2 py-2 text-left font-medium">Added By</th>
                                    <th scope="col" class="px-2 py-2 text-left font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-200">
                                <tr v-if="loading">
                                    <td class="px-4 py-14 text-center text-gray-600" colspan="6">Loading options</td>
                                </tr>
                                <tr v-else-if="!paymentOptions.length">
                                    <td class="px-4 py-12 text-center text-gray-500" colspan="6">No Payment Options Found</td>
                                </tr>
                                <tr v-else-if="filteredPayments.length === 0">
                                    <td colspan="5" class="px-4 py-12 text-center ">No Payment Options match "{{ searchQuery }}"</td>
                                </tr>
                                <tr v-for="(pay, index) in filteredPayments" :key="pay.id" >
                                    <td class="px-2 py-2 font-medium">{{ index +1  }}</td>
                                    <td class="px-2 py-2 font-medium">{{ pay.name }}</td>
                                    <td class="px-2 py-2 font-medium">{{ pay.account_number }}</td>
                                    <td class="px-2 py-2 text-center font-medium">
                                        <button
                                            @click="setDefault(pay)"
                                            :disabled="settingDefaultId === pay.id || pay.is_default"
                                            class="inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
                                            :class="pay.is_default
                                                ? 'border-green-600 bg-green-600 text-white cursor-default'
                                                : 'border-gray-400 bg-white text-gray-700 hover:border-green-500 hover:text-green-600 cursor-pointer'"
                                            :title="pay.is_default ? 'Default payment option' : 'Set as default'"
                                        >
                                            <Check v-if="pay.is_default" class="h-4 w-4" />
                                            <LockKeyhole v-else class="h-3.5 w-3.5" />
                                        </button>
                                    </td>
                                    <td class="px-2 py-2 font-medium">{{ pay.added_by_user?.name ?? '-' }}</td>
                                    <td class="px-2 py-2">
                                        <div class="flex items-center">
                                            <button
                                            @click="editPayment(pay)"
                                            class="flex items-center justify-center h-7 w-7 rounded-sm bg-green-600 text-white cursor-pointer hover:bg-green-700">
                                            <SquarePenIcon class="w-4 h-4"/>
                                            </button>
                                            <button
                                            @click="confirmDelete(pay)"
                                            class="flex items-center justify-center w-7 h-7 rounded-sm bg-red-600 text-white cursor-pointer hover:bg-red-700">
                                            <Trash2 class="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!--edit/register-->
                <div v-if="showModal" class="inset-0 backdrop-blur-sm fixed bg-black/50 z-50 flex items-center justify-center p-4">
                    <div class="bg-white rounded-lg max-w-2xl overflow-y-auto max-h-[80vh] w-full shadow-sm">
                        <div class="flex items-center justify-between border-b border-gray-200 p-4 sm:p-6">
                            <h2 class="font-medium text-sm text-gray-600">
                                {{ isEditingForm? 'Edit Payment Option':'New Payment Option' }}
                            </h2>
                            <button @click="closeModal" class="text-gray-400"><X class="w-4 h-4"/></button>
                        </div>
                        <form @submit.prevent="saveOption" class="space-y-4  sm:p-6">
                            <div class="grid grid-cols-1 sm:grid-cols-1 gap-4">
                                <label class="block text-xs font-medium mb-1 text-gray-700">Name</label>
                                <input type="text" v-model="form.name" class="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm outline:nome">
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-1 gap-4">
                                <label class="block text-xs font-medium mb-1 text-gray-700">Account Number</label>
                                <input type="text" v-model="form.account_number" class="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm outline:nome">
                            </div>
                            <div class="flex flex-col-reverse justify-end gap-3 border-t border-gray-400 pt-4 sm:flex-row sm:items-center">
                                <button @click="closeModal" type="button" class="text-sm rounded-sm bg-gray-500 border border-gray-500 px-4 py-2 text-white">Cancel</button>
                                <button type="submit" :disabled="saving" class="flex items-center justify-center gap-3 border border-gray-300 px-4 py-2 rounded-sm bg-green-600 text-white text-sm cursor-pointer">
                                    <CheckCheckIcon class="w-4 h-4 shrink-0"/>{{ saving ? 'saving...' : (isEditingForm ? 'Update' : 'Submit') }}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!--delete modal-->
                <div v-if="showDeleteModal" class="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4">
                    <div class="max-w-2xl shadow-sm bg-white rounded-sm w-full p-6">
                        <h2 class="font-medium text-lg">Delete Payment Option</h2>
                        <p class="text-gray-400 mt-2 font-medium mb-4 text-sm">
                            Are you sure, you want to delete <span class="font-bold text-gray-800">"{{ optionToDelete?.name }}"?</span>This cannot be undone.
                        </p>
                        <div class="flex justify-end gap-3">
                            <button @click="cancelDelete"
                            type="button" 
                            class="rounded-sm bg-gray-500 border border-gray-500 px-4 py-2 text-sm text-white cursor-pointer"
                            >Cancel</button>
                            <button @click="deletePayment"
                            type="button"
                            :disabled="deleting"
                            class="flex items-center justify-center gap-0 rounded-sm bg-red-600 px-4 py-2 text-sm text-white cursor-pointer">
                            <CircleCheck class="w-4 h-4"/>  {{ deleting ? 'Deleting...' :'Yes' }}
                            </button>
                        </div>
                    </div>
                </div>
          </div> 
    </div>
</template>
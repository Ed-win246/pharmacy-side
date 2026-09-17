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


const form=reactive([

]);


</script>
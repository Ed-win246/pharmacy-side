<script setup>
import { onMounted, ref, reactive } from 'vue';
import { Plus, Pencil, Trash2, X } from 'lucide-vue-next';
import api from '@/lib/api';

// State
const medicines = ref([]);
const showModal = ref(false);
const editingId = ref(null);
const isEditingForm = ref(false);
const saving = ref(false);

const loading=ref(true);

onMounted(async()=>{
    await fetchMedicines();
    loading.value = false;
});

async function fetchMedicines(){
    loading.value=true;
    try{
        const {data}=await api.get('/medicines');
        medicines.value=data;

    }catch(error){
        console.error('Error fetching medicines', error);
    }finally{
        loading.value = false;
    }
}


const categories = [
  'Tablets', 
  'Capsules', 
  'Syrups', 
  'Injections', 
  'Ointments/Creams', 
  'Supplements'
];

const form = reactive({
  name: '',
  genericName: '',
  category: '',
  stockQuantity: '',
  strength: '',
  dosage: '',
  packSize: '',
  unitPrice: '',
  expiryDate: '',
});

function resetForm() {
  form.name = '';
  form.genericName = '';
  form.category = '';
  form.stockQuantity = '';
  form.strength = '';
  form.dosage = '';
  form.packSize = '';
  form.unitPrice = '';
  form.expiryDate = '';
}

function addNewMedicine() {
  resetForm();
  editingId.value = null;
  isEditingForm.value = false;
  showModal.value = true;
}

function editMedicine(medicine) {
  form.name = medicine.name;
  form.genericName = medicine.genericName;
  form.category = medicine.category;
  form.stockQuantity = medicine.stockQuantity;
  form.strength = medicine.strength;
  form.dosage = medicine.dosage;
  form.packSize = medicine.packSize;
  form.unitPrice = medicine.unitPrice;
  form.expiryDate = medicine.expiryDate;
  
  editingId.value = medicine.id;
  isEditingForm.value = true;
  showModal.value = true;
}
//edited delete function to include confirmation and error handling
 async function deleteMedicine(med) {
  if (!confirm(`Delete ${med.name}? This action cannot be undone.`)) return;
  try {
    await api.delete(`/medicines/${med.id}`);
    medicines.value = medicines.value.filter(m => m.id !== med.id);
  }catch(error){
    console.error('Error deleting medicine',error);
    alert('Failed to delete medicine.');
  }
}

function closeModal() {
  showModal.value = false;
  resetForm();
}

 async function saveMedicine() {
  if (!form.name || !form.stockQuantity || !form.unitPrice) {
    alert('Please fill in required fields: Name, Stock Quantity, and Unit Price.');
    return;
  }
// mapping form data to payload for API submission
  const payload = {
    name: form.name,
    genericName: form.genericName,
    category: form.category,
    stockQuantity: Number(form.stockQuantity),
    strength: form.strength,
    dosage: form.dosage,
    packSize: form.packSize,
    unitPrice: Number(form.unitPrice),
    expiryDate: form.expiryDate,
  };
  saving.value=true;
   try{
    if(isEditingForm.value){
        const {data}=await api.put(`/medicines/${editingId.value}`,payload);
        const index= medicines.value.findIndex(m =>m.id===editingId.value);
        if(index!==-1){
            medicines.value[index]=data;
        }
    }else{
        const {data}= await api.post('/medicines', payload);
        medicines.value.unshift(data);
    }
    showModal.value=false;
   }catch(error){
    console.error('Error saving medicine', error);
    alert('Failed to save medicine. Please try again.');

   }finally{
    saving.value=false;
   }

  closeModal();
}


</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Products Inventory</h1>
        <p class="text-sm text-gray-500">Manage medicines and track stock levels</p>
      </div>
      <button 
        @click="addNewMedicine"
        class="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 font-medium transition"
      >
        <Plus class="w-4 h-4" /> Add New Medicine
      </button>
    </div>

    <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-gray-600 text-left">
          <thead class="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
            <tr>
              <th class="px-4 py-3">Medicine Name</th>
              <th class="px-4 py-3">Generic Name</th>
              <th class="px-4 py-3">Category</th>
              <th class="px-4 py-3">Stock</th>
              <th class="px-4 py-3">Strength</th>
              <th class="px-4 py-3">Dosage </th>
              <th class="px-4 py-3">Pack Size</th>
              <th class="px-4 py-3">Unit Price</th>
              <th class="px-4 py-3">Expiry Date</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-if="loading">
              <td class="text-center py-8 text-gray-500" colspan="10">
                Loading medicines...
              </td>
            </tr>
            <tr v-else-if="medicines.length === 0">
              <td class="text-center py-8 text-gray-500" colspan="10">
                No medicines available. Click "Add New Medicine" to create one.
              </td>
            </tr>

            <tr v-for="med in medicines" :key="med.id" class="hover:bg-gray-50 transition">
              <td class="px-4 py-3 font-semibold text-gray-900">{{ med.name }}</td>
              <td class="px-4 py-3 text-gray-500">{{ med.genericName }}</td>
              <td class="px-4 py-3">
                <span v-if="med.category" class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                  {{ med.category }}
                </span>
                <span v-else>—</span>
              </td>
              <td class="px-4 py-3">
                <span :class="[
                  'px-2 py-0.5 rounded-full text-xs font-semibold',
                  med.stockQuantity < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                ]">
                  {{ med.stockQuantity }} units
                </span>
              </td>
              <td class="px-4 py-3">{{ med.strength }}</td>
              <td class="px-4 py-3">{{ med.dosage  }}</td>
              <td class="px-4 py-3">{{ med.packSize  }}</td>
              <td class="px-4 py-3 font-semibold text-gray-800">shs {{ Number(med.unitPrice).toFixed(2) }}</td>
              <td class="px-4 py-3 text-xs">{{ med.expiryDate }}</td>
              <td class="px-4 py-3 text-right space-x-1">
                <button @click="editMedicine(med)" class="p-1.5 text-green-500 hover:text-green-600 rounded">
                  <Pencil class="w-4 h-4" />
                </button>
                <button @click="deleteMedicine(med)" class="p-1.5 text-red-500 hover:text-red-600 rounded">
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Registration / Editing Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-xl font-bold text-gray-800">
            {{ isEditingForm ? 'Edit Medicine Details' : 'Register New Medicine' }}
          </h2>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Form Body -->
        <form @submit.prevent="saveMedicine" class="p-6 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Medicine Name</label>
              <input v-model="form.name" type="text" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Amoxil" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Generic Name</label>
              <input v-model="form.genericName" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Amoxicillin" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Category</label>
              <select v-model="form.category" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">Select category...</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Strength</label>
              <input v-model="form.strength" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. 500mg" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Stock Quantity *</label>
              <input v-model="form.stockQuantity" type="number" min="0" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Unit Price ($) *</label>
              <input v-model="form.unitPrice" type="number" step="0.01" min="0" required class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="0.00" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Pack Size</label>
              <input v-model="form.packSize" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. 10x10 Blister Pack" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Expiry Date</label>
              <input v-model="form.expiryDate" type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Dosage Administration / Instructions</label>
            <input v-model="form.dosage" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Take 1 tablet twice daily after meals" />
          </div>

          <!-- Modal Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" @click="closeModal" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium">
              {{ isEditingForm ? 'Update Medicine' : 'Register Medicine' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
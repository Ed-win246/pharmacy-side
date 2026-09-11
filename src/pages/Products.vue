<script setup>
import { onMounted, ref, reactive , computed } from 'vue';
import { Plus, Pencil,SquarePenIcon ,Trash2, X, CircleCheckIcon, Search } from 'lucide-vue-next';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';

const medicines = ref([]);
const showModal = ref(false);
const editingId = ref(null);
const isEditingForm = ref(false);
const saving = ref(false);
const loading = ref(true);
const showDeleteModal = ref(false);
const medicineToDelete = ref(null);
const deleting = ref(false);
const categories = ref([]);
const searchQuery=ref('');

onMounted(async () => {
  await Promise.all([fetchMedicines(), fetchCategories()]);
});

async function fetchMedicines() {
  loading.value = true;
  try {
    const { data } = await api.get('/medicines');
    medicines.value = data;
  } catch (error) {
    console.error('Error fetching medicines', error);
    toast.error('Failed to fetch medicines. Please try again later.');
  } finally {
    loading.value = false;
  }
}

async function fetchCategories() {
  loading.value=true;
  try {
    const { data } = await api.get('/categories');
    categories.value = data;
  } catch (error) {
    console.error('Error fetching categories', error);
    toast.error('Failed to fetch categories. Please try again later.');
  }
}

const form = reactive({
  name: '',
  genericName: '',
  category: '',
});

function resetForm() {
  form.name = '';
  form.genericName = '';
  form.category = '';
}

function formatDateForInput(dateString) {
  if (!dateString) return '';
  return dateString.split('T')[0];
}

function addNewMedicine() {
  resetForm();
  editingId.value = null;
  isEditingForm.value = false;
  showModal.value = true;
}

function editMedicine(medicine) {
  form.name = medicine.name || '';
  form.genericName = medicine.genericName || '';
  form.category = medicine.category || '';
  
  editingId.value = medicine.id;
  isEditingForm.value = true;
  showModal.value = true;
}


function closeModal() {
  showModal.value = false;
  resetForm();
}

async function saveMedicine() {
  if (!form.name ) {
    alert('Please fill in required fields: Name');
    return;
  }

  const payload = {
    name: form.name,
    genericName: form.genericName || null,
    category: form.category || null,
  };

  saving.value = true;
  try {
    if (isEditingForm.value) {
      const { data } = await api.put(`/medicines/${editingId.value}`, payload);
      const index = medicines.value.findIndex(m => m.id === editingId.value);
      if (index !== -1) {
        medicines.value[index] = data;
      }
      toast.success('Medicine updated successfully!');
    } else {
      const { data } = await api.post('/medicines', payload);
      medicines.value.unshift(data);
      toast.success('Medicine registered successfully!');
    }
    closeModal();
  } catch (error) {
    console.error('Error saving medicine', error);
    toast.error('Failed to save medicine. Please try again.');
  } finally {
    saving.value = false;
  }
}



function confirmDelete(med) {
  medicineToDelete.value = med;
  showDeleteModal.value = true;
}

function cancelDelete() {
  showDeleteModal.value = false;
  medicineToDelete.value = null;
}

async function deleteMedicine() {
  if (!medicineToDelete.value) return;
  deleting.value = true;
  try {
    await api.delete(`/medicines/${medicineToDelete.value.id}`);
    medicines.value = medicines.value.filter(m => m.id !== medicineToDelete.value.id);
    toast.success('Medicine deleted successfully!');
    showDeleteModal.value = false;
    medicineToDelete.value = null;
  } catch (error) {
    console.error('Error deleting medicine', error);
    toast.error('Medicine could not be deleted.');
  } finally {
    deleting.value = false;
  }
}
//searching for products function
const filterMedicines=computed(()=>{
  if(!searchQuery.value.trim()){
    return medicines.value;
  }
  const query=searchQuery.value.toLowerCase();
  return medicines.value.filter(med =>
    [med.name, med.genericName, med.category]
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(query))
  );
});
</script>

<template>
  <div class="h-full max-w-7xl mx-auto flex flex-col space-y-6 overflow-hidden">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-1xl font-medium text-gray-500 uppercase tracking-wide">Products </h1>
        <p class="text-sm text-gray-500">Manage medicines and track stock levels</p>
      </div>
      <button 
        @click="addNewMedicine"
        class="flex items-center rounded-sm gap-2 bg-green-600 text-white px-2 py-2  hover:bg-green-700 font-medium transition cursor-pointer"
      >
        <Plus class="w-4 h-4" /> New Product
      </button>
    </div>
    <!-- Search products -->
    <div class="relative max-w-sm pl-2">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search Product..."
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
    <div class="min-h-0 flex-1 bg-white  ">
      <div class="h-full overflow-auto">
        <table class="w-[90%] min-w-[620px] text-sm text-left text-gray-600 divide-y ">
          <thead class="sticky top-0 z-10 border-b border-gray-200  text-xs  tracking-wide text-gray-500">
            <tr>
              <th class="px-2 py-4 font-meduim">#</th>
              <th class="px-4 py-4 font-semibold">Medicine Name</th>
              <th class="px-4 py-4 font-semibold">Generic Name</th>
              <th class="px-4 py-4 font-semibold">Category</th>
              <th class="px-4 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading">
              <td class="px-5 py-12 text-center text-gray-500" colspan="5">
                Loading Products...
              </td>
            </tr>
            <tr v-else-if="filterMedicines.length === 0">
              <td class="px-5 py-12 text-center text-gray-500" colspan="5">
                {{ searchQuery ? 'No products match your search':'No products available' }}
              </td>
            </tr>
            <tr v-for="(med,index) in filterMedicines" :key="med.id" class="transition-colors hover:bg-green-50/40">
              <td class="px-2 py-2 font-medium">{{ index + 1 }}</td>
              <td class="px-2 py-2 font-semibold text-gray-900">{{ med.name }}</td>
              <td class="px-2 py-2 text-gray-500">{{ med.genericName || 'Not provided' }}</td>
              <td class="px-2 py-2">
                <span v-if="med.category" class="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                  {{ med.category }}
                </span>
                <span v-else class="text-gray-400">Not provided</span>
              </td>
              <td class="px-5 py-2">
                <div class="flex items-center gap-0">
                <button @click="editMedicine(med)" :aria-label="`Edit ${med.name}`" class="flex h-7 w-7 items-center justify-center rounded-l-sm rounded-r-none bg-green-500 text-white transition hover:bg-green-100 hover:text-green-700 cursor-pointer">
                  <SquarePenIcon class="w-4 h-4" />
                </button>
                <button @click="confirmDelete(med)" :aria-label="`Delete ${med.name}`" class="flex h-7 w-7 items-center justify-center rounded-l-none rounded-r-sm bg-red-500 text-white transition hover:bg-red-100 hover:text-red-600 cursor-pointer">
                  <Trash2 class="w-4 h-4" />
                </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full">
          <div class="p-6">
            <h2 class="text-lg font-semibold text-gray-800">Delete Product</h2>
            <p class="mt-2 text-sm text-gray-500">
              Are you sure you want to delete <span class="font-semibold text-gray-700">{{ medicineToDelete?.name }}</span>? This action cannot be undone.
            </p>
          </div>
          <div class="flex justify-end gap-3 p-4 border-t border-gray-200">
            <button @click="cancelDelete" class="cursor-pointer px-4 py-2 border border-gray-300 text-gray-700 rounded-sm text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button @click="deleteMedicine" :disabled="deleting" class="cursor-pointer px-4 py-2 bg-red-600 text-white rounded-sm text-sm hover:bg-red-700 font-medium disabled:opacity-50">
              {{ deleting ? 'Deleting...' : 'Submit' }}
            </button>
          </div>
        </div>
    </div>

    <!-- Registration / Editing Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 class="text-xl font-meduim text-gray-800">
            {{ isEditingForm ? 'Edit Product ' : 'New Product' }}
          </h2>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
            <X class="w-5 h-5" />
          </button>
        </div>

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
                <option v-for="cat in categories" :key="cat.id" :value="cat.Category_name">
                  {{ cat.Category_name }}
                </option>
              </select>
            </div>
            </div>
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" @click="closeModal" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-sm text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" :disabled="saving" class="flex items-center px-4 py-2 gap-2 bg-green-600 text-white  text-sm hover:bg-green-700 font-medium disabled:opacity-50 rounded-sm">
             <CircleCheckIcon class="w-4 h-4 "/> {{ saving ? 'Saving...' : (isEditingForm ? 'Submit' : 'Yes') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
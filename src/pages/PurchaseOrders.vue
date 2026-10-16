<script setup>
import {ref, reactive, onMounted} from 'vue'
import { Plus } from 'lucide-vue-next';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';

const loggedUser = ref(null)
const showModal = ref(false);
const loading = ref(false);
const purchaseOrders = ref([]);
const saving = ref(false);


</script>
<template>
    <div class="min-h-screen w-full">
        <div class="h-full flex flex-col pb-5 p-2">
            <div class="flex items-center justify-between  px-2 py-1">
                <div>
                    <h2 class="font-medium text-sm uppercase flex items-center gap-2">Purchase Orders</h2>
                </div>
                <div >
                    <h2 class="font-medium text-sm">
                        <router-link to="/dashboard" class="font-medium">Dashboard</router-link>
                        <span class="text-gray-400">/ Purchase Orders</span>
                    </h2>
                </div>
            </div>
            <div class="flex flex-wrap items-center justify-end pt-2 px-4">
                <button @click=""
                type="button"
                class="rounded-sm border bg-green-600 px-3 py-1.5 text-xs font-medium transition cursor-pointer flex items-center justify-center text-white">
                <Plus class="w-4 h-4 shrink-0 "/>New Purchase Order
                </button>
            </div>

            <div class="mt-2 bg-white shadow-sm rounded-sm overflow-x-auto">
                <table class="w-full text-left text-sm">
                    <thead class="tracking-wide border-b border-gray-200 text-black">
                        <tr>
                            <th class="px-4 py-3 font-medium">#</th>
                            <th class="px-4 py-3 font-medium">Orders ID</th>
                            <th class="px-4 py-3 font-medium">Suppliers</th>
                            <th class="px-4 py-3 font-medium">Product</th>
                            <th class="px-4 py-3 font-medium">Quantity</th>
                            <th class="px-4 py-3 font-medium">Order Date</th>
                            <th class="px-4 py-3 font-medium">Expected Date</th>
                        </tr>
                    </thead>
                </table>
            </div>
        </div>
    </div>
</template>
<script setup>
import {ref, reactive, onMounted} from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { Eye } from 'lucide-vue-next';
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
                </table>
            </div>
        </div>
    </div>
</template>
<script setup>
import {ref, reactive, onMounted} from 'vue';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';
import { Eye } from 'lucide-vue-next';

</script>
<template>
    <div class="min-h-screen w-full">
        <div class="max-w-7xl h-full max-auto flex flex-col overflow-y-auto pb-10 p-2">
            <div class="flex items-center justify-between border-b border-gray-200 p-4">
                <div>
                    <h2 class="font-medium text-sm flex items-center uppercase gap-2">Batch Levels</h2>
                </div>
                    <div class="font-medium text-sm">
                        <router-link to="/dashboard" class="cursor-pointer text-black">Dashboard</router-link>
                        <span class="text-gray-400">/ Batch Levels</span>
                    </div>
            </div>
        </div>
    </div>
</template>
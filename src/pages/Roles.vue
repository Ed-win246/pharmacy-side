<script setup>

import {ref,onMounted, reactive} from 'vue';
import {Plus} from 'lucide-vue-next';
</script>

<template>
    <div class="min-h-screen w-full">
        <div class="h-full max-w-7xl max-auto overflow-y-auto flex-col pb-5 p-2">
            <div class="flex items-center justify-between  px-2 py-1">
                <div>
                    <h2 class="font-medium text-sm uppercase flex items-center gap-2">User Roles</h2>
                </div>
                <div >
                    <h2 class="font-medium text-sm">
                        <router-link to="/dashboard" class="font-medium">Dashboard</router-link>
                        <span class="text-gray-400">/ User Roles</span>
                    </h2>
                </div>
            </div>


            <div class="min-h-0 overflow-hidden flex-1">
                <div class="overflow-auto w-full h-full">
                    <div class="flex items-center justify-end gap-2 p-4">
                        <button class="flex items-center rounded-sm text-xs px-2 py-1.5 gap-2 mt-2 bg-green-500 cursor-pointer text-white">
                            <Plus class="w-4 h-4"/>New User Role
                        </button>
                    </div>
                </div>

                <table class="min-w-[560px] w-full divide-y divide-slate mt-2 text-left text-sm">
                    <thead class="sticky top-0 z-10 tracking-wide text-black">
                        <tr class="border-b border-gray-400">
                            <th scope="col" class="px-2 py-2 text-left font-medium">#</th>
                            <th scope="col" class="px-2 py-2 text-left font-medium">User Role</th>
                            <th scope="col" class="px-2 py-2 text-left font-medium">Added By</th>
                            <th scope="col" class="px-2 py-2 text-left font-medium">Actions</th>
                        </tr>
                    </thead>
                 </table>
            </div>
        </div>
    </div>
</template>
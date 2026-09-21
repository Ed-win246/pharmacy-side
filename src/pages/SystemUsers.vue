<script setup>
</script>
<template>
    <div class="min-h-screen w-full">
        <div class="max-w-7xl h-full max-auto flex-col overflow-y-auto pb-5 p-2">
            <div class="flex items-center justify-between  px-2 py-1">
                <div>
                    <h2 class="font-medium uppercase text-sm flex items-center gap-2">System Users</h2>
                </div>
                <div class="font-medium texr-sm">
                    <router-link to="/dashboard" class="font-medium cursor-pointer">Dashboard</router-link>
                    <span class="text-gray-400">/ System Users</span>
                </div>
            </div>

            <table class="min-w-[560px] w-full divide-y divide-slate-100 mt-2 text-sm text-left">
                <thead class="sticky z-10 top-0 tracking-wide border-b border-gray-400 text-black ">
                    <tr>
                        <td class="px-2 py-2 font-medium">#</td>
                        <td class="px-2 py-2 font-medium">Full Name</td>
                        <td class="px-2 py-2 font-medium">Contact</td>
                        <td class="px-2 py-2 font-medium">Email Address</td>
                        <td class="px-2 py-2 font-medium">User Name</td>
                        <td class="px-2 py-2 font-medium">Role</td>
                        <td class="px-2 py-2 font-medium">Actions</td>
                    </tr>
                </thead>
            </table>
        </div>
    </div>
</template>
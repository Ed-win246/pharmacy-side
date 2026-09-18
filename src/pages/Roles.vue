<script setup></script>
<template>
    <div class="min-h-screen w-full">
        <div class="h-full max-w-7xl max-auto overflow-y-auto flex-col pb-5 p-2">
            <div class="flex items-center justify-between border-b border-gray-400 px-2 py-1">
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
        </div>
    </div>
</template>
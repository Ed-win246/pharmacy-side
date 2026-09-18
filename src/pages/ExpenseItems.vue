<script setup></script>
<template>
    <div class="min-h-screen w-full">
        <div class="h-full max-w-7xl max-auto overflow-y-auto pb-5 p-2">
            <div class="flex items-center justify-between border-b border-gray-400 px-2 py-1">
                <div>
                    <h2 class="font-medium uppercase flex items-center gap-2">Expense Items</h2>
                </div>
                <div class="font-medium text-sm">
                    <router-link to="/dashboard" class="cursor-pointer">Dashboard</router-link>
                    <span class="text-gray-400">/ Expense Items</span>
                </div>
            </div>
        </div>
    </div>
</template>
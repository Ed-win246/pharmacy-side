<script setup>
const currentYear = new Date().getFullYear();
</script>
<template>
    <footer class="flex w-full shrink-0 items-center justify-between border-t border-gray-200 bg-white px-6 py-4 text-sm text-gray-500">
        <p class="flex-1 text-left">&copy; {{ currentYear }} PharmaTech.</p>
        <p class="flex-1 text-center">License expires in <span class="text-blue-500">{{ currentYear + 1 }}.</span></p>
        <p class="flex-1 text-right">All rights reserved.</p>

    </footer>
</template>
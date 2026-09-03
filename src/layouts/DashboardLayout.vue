<script setup >
import Sidebar from '@/components/Sidebar.vue';
</script>

<template>
    <div class="flex min-h-screen bg-gray-500">
        <Sidebar/>
        
        <main class="flex-1 p-8">
            <router-view/>
        </main>
    </div>
</template>
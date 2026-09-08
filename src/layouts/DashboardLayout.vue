<script setup>
import Sidebar from '@/components/Sidebar.vue';
</script>

<template>
  <div class="flex min-h-screen overflow-hidden bg-white">
    <Sidebar />
    <main class="flex-1 min-w-0 overflow-y-auto p-6">
      <router-view />
    </main>
  </div>
</template>
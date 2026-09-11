<script setup>
import Sidebar from '@/components/Sidebar.vue';
import Footer from '@/components/Footer.vue';
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-white">
    <Sidebar />
    <main class="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-gray-50">
      <div class="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
        <router-view />
      </div>
      <Footer />
    </main>
  </div>
</template>
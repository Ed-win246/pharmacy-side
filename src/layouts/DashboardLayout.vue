<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next';
import Sidebar from '@/components/Sidebar.vue';
import Footer from '@/components/Footer.vue';

const route = useRoute();
const isSidebarOpen = ref(false);
const isSidebarCollapsed = ref(false);

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value;
}

function closeSidebar() {
  isSidebarOpen.value = false;
}

function toggleCollapse() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

// Auto-close mobile sidebar when navigating between pages
watch(() => route.path, () => {
  closeSidebar();
});
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-white relative">
    <div
      v-if="isSidebarOpen"
      @click="closeSidebar"
      class="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
    ></div>


    <Sidebar 
      :isOpen="isSidebarOpen" 
      :isCollapsed="isSidebarCollapsed" 
      @close="closeSidebar" 
      @toggleCollapse="toggleCollapse" 
    />

    <!-- Main Content Area -->
    <main class="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-gray-50">
      <header class="hidden lg:flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shrink-0">
        <div class="flex items-center gap-3">
          <button
            @click="toggleCollapse"
            type="button"
            class="p-2 text-gray-600 hover:bg-gray-100 hover:text-green-600 rounded-lg focus:outline-none cursor-pointer transition-colors flex items-center gap-2"
          >
            <PanelLeftClose v-if="!isSidebarCollapsed" class="w-5 h-5 text-gray-600" />
            <PanelLeftOpen v-else class="w-5 h-5 text-green-600" />
          </button>
          <span class="text-base font-semibold text-gray-800">Pharmacy Testing</span>
        </div>

        <div class="flex items-center gap-4 text-xs font-medium text-gray-500">
          <span>Reports | Subscriptions</span>
        </div>
      </header>


      <header class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
            P
          </div>
          <span class="font-bold text-green-600 text-lg">Pharmacy Portal</span>
        </div>
        <button
          @click="toggleSidebar"
          type="button"
          class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg focus:outline-none cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          <Menu v-if="!isSidebarOpen" class="w-6 h-6" />
          <X v-else class="w-6 h-6" />
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
        <router-view />
      </div>
      <Footer />
    </main>
  </div>
</template>
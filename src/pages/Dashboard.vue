<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '@/components/Sidebar.vue';
import api from '@/lib/api';

const router = useRouter();
const user = ref(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data } = await api.get('/user');
    user.value = data;
  } catch (e) {
    // token invalid/expired — send back to login
    router.push('/login');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div v-if="loading">Loading...</div>
    <div v-else-if="user">
      <h1 class="text-2xl font-bold mb-4">Welcome, {{ user.name }}</h1>
      <p class="text-gray-600 mb-4">{{ user.email }}</p>
    </div>
  </div>
</template>
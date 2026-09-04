<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
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
<p>Welcome to the Dashboard</p>
</template>
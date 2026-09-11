<script setup>
import { ref } from 'vue';
import {useRoute, useRouter } from 'vue-router';
import {
  Card,
  CardTitle,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Mail, Lock, Eye, EyeOff } from 'lucide-vue-next';
import logo from '@/assets/pharm.jpg';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';

const email = ref('');
const password = ref('');
const error = ref(null);
const loading = ref(false);
const showPassword = ref(false);

const router = useRouter();
const route= useRoute();

async function handleLogin() {
  error.value = null;
  loading.value = true;

  try {
    const { data } = await api.post('/login', {
      email: email.value,
      password: password.value,
    });

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    router.push('/dashboard');
  } catch (e) {
    error.value =
      e.response?.data?.message ||
      'Login failed. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center bg-gray-100 py-8 px-4"
  >
    <img
      :src="logo"
      alt="Pharmacy Logo"
      class="w-40 h-40 sm:w-32 sm:h-32 md:w-40 md:h-40 mb-4 rounded-full object-cover shadow-md"
    />
    <div
      v-if="route.query.registered"
      class="mb-4 w-full max-w-[380px] rounded-md bg-green-50 border border-green-200 p-3"
    >
      <p class="text-sm text-green-700 text-center">
        Registration submitted! You'll be able to log in once an admin approves your account.
      </p>
    </div>
    <Card class="w-full max-w-[380px] shadow-xl">
      <CardHeader>
        <CardTitle class="flex justify-center items-center">
          Login To Your Account
        </CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleLogin">
          <div class="grid gap-4">
            <!-- Email -->
            <div class="flex flex-col space-y-2">
              <Label for="email">Email</Label>
              <div class="relative">
                <Mail
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                />
                <Input
                  id="email"
                  v-model="email"
                  type="email"
                  placeholder="example@gmail.com"
                  class="pl-9"
                  required
                />
              </div>
            </div>
            <!-- Password -->
            <div class="flex flex-col space-y-2">
              <div class="flex items-center">
                <Label for="password">Password</Label>
                <a
                  href="#"
                  class="ml-auto text-sm underline"
                >
                  Forgot Your Password?
                </a>
              </div>
              <div class="relative">
                <Lock
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                />
                <Input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter your password"
                  class="pl-9 pr-10"
                  required
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Eye
                    v-if="!showPassword"
                    class="w-4 h-4"
                  />
                  <EyeOff
                    v-else
                    class="w-4 h-4"
                  />
                </button>
              </div>
            </div>
          </div>
          <!-- Error Message -->
          <div
            v-if="error"
            class="mt-4 rounded-md bg-red-50 border border-red-200 p-3"
          >
            <p class="text-sm text-red-600 text-center mb-2">{{ error }}</p>
          </div>
            <Button
              type="submit"
              :disabled="loading"
              class="w-full bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg mt-4"
            >
              {{ loading ? 'Signing in...' : 'Login' }}
            </Button>
            <p class="text-sm text-center mt-4 text-gray-600">
              Dont have an account?
              <router-link to="/register" class="text-blue-600 font-medium hover:underline" >
                Register Here
              </router-link>
            </p>
        </form>
      </CardContent>
    </Card>
  </div>
</template>


<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
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
import { Mail, Lock, User, Building2, Phone, Eye, EyeOff } from 'lucide-vue-next';
import logo from '@/assets/pharm.jpg';
import api from '@/lib/api';
import toast from '@tsirosgeorge/toastnotification';

const router = useRouter();

const pharmacy_name = ref('');
const owner_name = ref('');
const owner_email = ref('');
const owner_phone = ref('');
const password = ref('');
const password_confirmation = ref('');

const error = ref(null);
const loading = ref(false);
const showPassword = ref(false);

async function handleRegister() {
  error.value = null;

  if (password.value !== password_confirmation.value) {
    error.value = 'Passwords do not match.';
    toast.error('Passwords do not match');
    return;
  }

  loading.value = true;
  try {
    await api.post('/register-request', {
      pharmacy_name: pharmacy_name.value,
      owner_name: owner_name.value,
      owner_email: owner_email.value,
      owner_phone: owner_phone.value,
      password: password.value,
      password_confirmation:password_confirmation.value
    });

    router.push({ path: '/login', query: { registered: '1' } });
    toast.success('Pharmacy registered successfully')
  } catch (e) {
    error.value = e.response?.data?.message || 'Registration failed. Please check your details and try again.';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 py-8 px-4">
    <img
      :src="logo"
      alt="Pharmacy Logo"
      class="w-32 h-32 mb-4 rounded-full object-cover shadow-md"
    />
    <Card class="w-full max-w-[420px] shadow-xl">
      <CardHeader>
        <CardTitle class="flex justify-center items-center">
          Register Your Pharmacy Here
        </CardTitle>
        <CardDescription class="text-center">
          Submit your details for admin approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleRegister" class="space-y-4 ">

          <div class="flex flex-col space-y-2">
            <Label for="pharmacy_name">Pharmacy Name</Label>
            <div class="relative">
              <Building2 class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input id="pharmacy_name" v-model="pharmacy_name" type="text" placeholder="e.g. City Pharmacy" class="pl-9" required />
            </div>
          </div>

          <div class="flex flex-col space-y-2">
            <Label for="owner_name">Owner Name</Label>
            <div class="relative">
              <User class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input id="owner_name" v-model="owner_name" type="text" placeholder="Full name" class="pl-9" required />
            </div>
          </div>

          <div class="flex flex-col space-y-2">
            <Label for="owner_email">Email</Label>
            <div class="relative">
              <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input id="owner_email" v-model="owner_email" type="email" placeholder="example@gmail.com" class="pl-9" required />
            </div>
          </div>

          <div class="flex flex-col space-y-2">
            <Label for="owner_phone">Phone</Label>
            <div class="relative">
              <Phone class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input id="owner_phone" v-model="owner_phone" type="tel" placeholder="Phone number" class="pl-9" required />
            </div>
          </div>

          <div class="flex flex-col space-y-2">
            <Label for="password">Password</Label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter  password"
                class="pl-9 pr-10"
                minlength="8"
                required
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Eye v-if="!showPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="flex flex-col space-y-2">
            <Label for="password_confirmation">Confirm Password</Label>
            <div class="relative">
              <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="password_confirmation"
                v-model="password_confirmation"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Re-enter password"
                class="pl-9"
                minlength="8"
                required
              />
            </div>
          </div>

          <div v-if="error" class="rounded-md bg-red-50 border border-red-200 p-3">
            <p class="text-sm text-red-600 text-center">{{ error }}</p>
          </div>

          <Button
            type="submit"
            :disabled="loading"
            class="w-full bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg"
          >
            {{ loading ? 'Submitting...' : 'Submit for Approval' }}
          </Button>

          <p class="text-sm text-center text-gray-500">
            Already have an account?
            <router-link to="/login" class="text-green-600 font-medium hover:underline">
              Login here
            </router-link>
          </p>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
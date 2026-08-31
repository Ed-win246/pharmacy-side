<script setup lang="js">
import { ref } from 'vue';
import { Card, CardTitle, CardContent, CardDescription, CardHeader, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Mail, Lock, Eye, EyeOff } from 'lucide-vue-next';
import logo from '@/assets/pharm.jpg';

const email = ref('');
const password = ref('');
const error = ref();
const loading = ref(false);
const showPassword = ref(false);

</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 py-8 px-4">
    <img :src="logo" alt="Pharmacy Logo" class="w-40 h-40 sm:w-32 sm:h-32 md:w-40 md:h-40 mb-4 rounded-full object-cover shadow-md"/>
    <Card class="w-full max-w-[380px] shadow-xl">
      <CardHeader>
        <CardTitle class="items-center justify-center flex">Login To Your Account</CardTitle>
        <CardDescription>Enter your Email below to login to your Account</CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="handleLogin">
          <div class="w-full items-center gap-4 grid">
            <div class="flex flex-col space-y-2">
              <Label for="email">Email</Label>
              <div class="relative">
                <Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  id="email"
                  v-model="email"
                  placeholder="example@gmail.com"
                  class="pl-9"
                />
              </div>
            </div>
            <div class="flex flex-col space-y-1.5 gap-2">
              <div class="flex items-center">
                <Label for="password">Password</Label>
                <a href="#" class="ml-auto inline-block text-sm underline">Forgot Your Password</a>
              </div>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  :type="showPassword ? 'text' : 'password'"
                  id="password"
                  v-model="password"
                  placeholder="Enter your password"
                  class="pl-9 pr-9"
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
          </div>
        </form>
      </CardContent>
      <CardFooter class="flex flex-col gap-2 ">
        <Button type="submit" class="w-full bg-green-500 hover:bg-green-500 text-white font-semibold rounded-lg">Login In</Button>
      </CardFooter>
    </Card>
  </div>
</template>
<script setup>
import { cn } from "@/lib/utils";

const props = defineProps();
</script>

<template>
  <div
    data-slot="card-footer"
    :class="cn('flex  w-[100%] items-center px-6 [.border-t]:pt-6', props.class)"
  >
    <slot />
  </div>
</template>

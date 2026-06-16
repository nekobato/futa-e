<script setup lang="ts">
/** Controls the page-level gradient behind the transparent animation canvas. */
const { background = '#080b12' } = defineProps<{
  background?: string
}>()
</script>

<template>
  <section class="background-frame" :style="{ background }" aria-hidden="true">
    <slot />
  </section>
</template>

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'

const { frontmatter } = useData()
</script>

<template>
  <main
    v-if="frontmatter.background"
    class="futae-background-layout"
    aria-label="Futa-e animated background"
  >
    <Content />
  </main>
  <DefaultTheme.Layout v-else />
</template>

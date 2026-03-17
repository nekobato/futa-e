<template>
  <div class="app-shell" :class="{ 'is-player': view === 'player' }">
    <PlayerView v-if="view === 'player'" />
    <ControlView v-else />
  </div>
</template>

<script setup lang="ts">
import ControlView from './views/ControlView.vue'
import PlayerView from './views/PlayerView.vue'

const view =
  new URLSearchParams(window.location.search).get('view') ?? 'control'
</script>

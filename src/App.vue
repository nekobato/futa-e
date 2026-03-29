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

<style lang="scss">
:root {
  color-scheme: light;
  --ink: var(--p-text-color);
  --muted: var(--p-text-muted-color);
  --accent: var(--p-primary-color);
  --accent-soft: var(--p-primary-100);
  --accent-warm: var(--p-orange-300);
  --paper: var(--p-surface-50);
  --paper-2: var(--p-surface-100);
  --panel: color-mix(in srgb, var(--p-surface-0), transparent 2%);
  --surface: color-mix(in srgb, var(--p-surface-0), transparent 6%);
  --surface-strong: var(--p-surface-0);
  --panel-soft: color-mix(in srgb, var(--p-surface-0), transparent 28%);
  --panel-soft-strong: color-mix(in srgb, var(--p-surface-0), transparent 16%);
  --panel-soft-emphasis: color-mix(in srgb, var(--p-surface-0), transparent 4%);
  --line: color-mix(in srgb, var(--p-content-border-color), transparent 34%);
  --line-strong: var(--p-content-border-color);
  --line-subtle: color-mix(
    in srgb,
    var(--p-content-border-color),
    transparent 58%
  );
  --hero-glow: color-mix(in srgb, var(--p-primary-200), transparent 74%);
  --warm-glow: color-mix(in srgb, var(--p-orange-200), transparent 80%);
  --focus-line: var(--p-form-field-focus-border-color);
  --focus-ring: color-mix(in srgb, var(--p-primary-300), transparent 72%);
  --shadow: 0 20px 60px
    color-mix(in srgb, var(--p-surface-950), transparent 86%);
  --radius: 18px;
  --gap: 20px;
  font-family:
    'Hiragino Sans',
    -apple-system,
    BlinkMacSystemFont,
    'Yu Gothic UI',
    'Yu Gothic',
    'Meiryo',
    'Noto Sans JP',
    sans-serif;
  color: var(--ink);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(
      circle at top left,
      color-mix(in srgb, var(--p-surface-0), transparent 26%),
      transparent 55%
    ),
    radial-gradient(circle at 84% 0%, var(--warm-glow), transparent 42%),
    linear-gradient(160deg, var(--paper), var(--paper-2));
  color: var(--ink);
}

#app {
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
  padding: 18px 22px 24px;
  display: flex;
  align-items: stretch;
  justify-content: center;

  &::before {
    content: '';
    position: fixed;
    inset: -20% 18% auto -18%;
    height: 360px;
    background: radial-gradient(circle, var(--hero-glow), transparent 70%);
    filter: blur(2px);
    pointer-events: none;
    z-index: 0;
  }

  &.is-player {
    padding: 0;
  }
}
</style>

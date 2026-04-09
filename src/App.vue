<template>
  <div class="app-shell" :class="{ 'is-player': view === 'player' }">
    <Toast v-if="view !== 'player'" position="bottom-center" />
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
@font-face {
  font-family: 'Quantico';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/quantico-regular-latin.woff2') format('woff2');
  unicode-range:
    U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
    U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212,
    U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Quantico';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/quantico-bold-latin.woff2') format('woff2');
  unicode-range:
    U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
    U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212,
    U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 100 900;
  font-stretch: 100%;
  font-display: swap;
  src: url('/fonts/roboto-variable-latin.woff2') format('woff2');
  unicode-range:
    U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
    U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212,
    U+2215, U+FEFF, U+FFFD;
}

:root {
  color-scheme: light;
  --font-body: 'Roboto', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif;
  --font-display:
    'Quantico', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif;
  --ink: var(--p-text-color);
  --muted: var(--p-text-muted-color);
  --accent: var(--p-primary-color);
  --accent-soft: color-mix(in srgb, var(--p-primary-100), white 38%);
  --accent-warm: color-mix(in srgb, var(--p-orange-300), white 18%);
  --paper: #eeede8;
  --paper-2: #f4f3eb;
  --panel: #f2f2e8;
  --surface: #f6f5ef;
  --surface-strong: #fcfbf6;
  --panel-soft: color-mix(in srgb, var(--panel), white 34%);
  --panel-soft-strong: color-mix(in srgb, var(--panel), white 54%);
  --panel-soft-emphasis: color-mix(in srgb, var(--accent-soft), white 42%);
  --line: color-mix(in srgb, var(--p-content-border-color), transparent 42%);
  --line-strong: color-mix(
    in srgb,
    var(--p-content-border-color),
    var(--p-surface-700) 8%
  );
  --line-subtle: color-mix(
    in srgb,
    var(--p-content-border-color),
    transparent 58%
  );
  --hero-glow: color-mix(in srgb, var(--p-primary-200), transparent 82%);
  --warm-glow: color-mix(in srgb, var(--p-orange-200), transparent 88%);
  --focus-line: var(--p-form-field-focus-border-color);
  --focus-ring: color-mix(in srgb, var(--p-primary-300), transparent 72%);
  --shadow: 0 28px 90px
    color-mix(in srgb, var(--p-surface-950), transparent 90%);
  --radius: 26px;
  --radius-card: 18px;
  --gap: 24px;
  font-family: var(--font-body);
  font-size: 14px;
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
      circle at 12% 14%,
      color-mix(in srgb, var(--p-surface-0), transparent 22%),
      transparent 55%
    ),
    radial-gradient(circle at 78% 8%, var(--warm-glow), transparent 38%),
    linear-gradient(180deg, #ebeae5, #f3f2ec 28%, #efeee8);
  color: var(--ink);
}

#app {
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
  padding: 28px 32px 34px;
  display: flex;
  align-items: stretch;
  justify-content: center;

  &::before {
    content: '';
    position: fixed;
    inset: -16% 8% auto -12%;
    height: 420px;
    background: radial-gradient(circle, var(--hero-glow), transparent 70%);
    filter: blur(10px);
    opacity: 0.9;
    pointer-events: none;
    z-index: 0;
  }

  &::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(
        to right,
        color-mix(in srgb, var(--line-subtle), transparent 72%) 1px,
        transparent 1px
      ),
      linear-gradient(
        to bottom,
        color-mix(in srgb, var(--line-subtle), transparent 82%) 1px,
        transparent 1px
      );
    background-size: 120px 120px;
    mask-image: linear-gradient(
      180deg,
      transparent,
      rgba(0, 0, 0, 0.22) 18%,
      rgba(0, 0, 0, 0.12) 84%,
      transparent
    );
    pointer-events: none;
    z-index: 0;
  }

  &.is-player {
    padding: 0;

    &::after,
    &::before {
      display: none;
    }
  }
}
</style>

<template>
  <div class="player-stage">
    <div class="player-media" v-if="!privacyEnabled && !safeMode">
      <img
        v-if="currentItem?.type === 'image'"
        :src="currentSource"
        :alt="currentItem?.title"
        @error="onMediaError"
      />
      <video
        v-else-if="currentItem?.type === 'video'"
        ref="videoRef"
        :src="currentSource"
        :muted="currentItem?.mute ?? false"
        autoplay
        playsinline
        @ended="onVideoEnded"
        @error="onMediaError"
      />
      <iframe
        v-else-if="currentItem?.type === 'web'"
        ref="webRef"
        :src="currentSource"
        @load="onWebLoaded"
      ></iframe>
    </div>

    <div v-if="privacyEnabled" class="player-overlay">
      <div>
        <h2>Privacy Lid</h2>
        <p>Display is paused.</p>
      </div>
    </div>

    <div v-else-if="safeMode" class="player-overlay">
      <div>
        <img :src="safeModeUrl" alt="Safe mode" />
        <h2>Safe Mode</h2>
        <p>{{ safeModeMessage }}</p>
      </div>
    </div>

    <div v-else-if="showWebFallback" class="player-overlay">
      <div>
        <img :src="fallbackSource" alt="Fallback" />
        <h2>Web Fallback</h2>
        <p>Web content timed out. Switched to fallback.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PlayerConfig, PlaylistItem } from '../shared/types'
import { createDefaultConfig } from '../shared/defaults'

const api = window.futae

const config = ref<PlayerConfig>(createDefaultConfig())
const currentIndex = ref(0)
const safeModeMessage = ref('')
const privacyEnabled = ref(false)
const webState = ref<'loading' | 'ready' | 'failed'>('ready')

const videoRef = ref<HTMLVideoElement | null>(null)
const webRef = ref<HTMLIFrameElement | null>(null)

let playbackTimer: number | null = null
let webTimer: number | null = null
let heartbeatTimer: number | null = null
let removeConfigListener: (() => void) | null = null
let removePrivacyListener: (() => void) | null = null

const safeModeUrl = new URL('/safe-mode.svg', window.location.origin).toString()

const currentItem = computed(() => config.value.playlist[currentIndex.value] ?? null)
const safeMode = computed(() => Boolean(safeModeMessage.value))
const showWebFallback = computed(() => currentItem.value?.type === 'web' && webState.value === 'failed')

const resolveSource = (src: string): string => {
  if (!src) {
    return ''
  }
  if (src.startsWith('http') || src.startsWith('file://')) {
    return src
  }
  return api.utils.toFileUrl(src)
}

const currentSource = computed(() => (currentItem.value ? resolveSource(currentItem.value.src) : ''))
const fallbackSource = computed(() => {
  if (!currentItem.value?.fallbackSrc) {
    return safeModeUrl
  }
  return resolveSource(currentItem.value.fallbackSrc)
})

const clearPlaybackTimer = () => {
  if (playbackTimer) {
    window.clearTimeout(playbackTimer)
    playbackTimer = null
  }
}

const clearWebTimer = () => {
  if (webTimer) {
    window.clearTimeout(webTimer)
    webTimer = null
  }
}

const enterSafeMode = (message: string) => {
  safeModeMessage.value = message
  clearPlaybackTimer()
  clearWebTimer()
}

const scheduleNext = (delayMs: number) => {
  clearPlaybackTimer()
  playbackTimer = window.setTimeout(() => {
    stepNext()
  }, delayMs)
}

const startWebTimeout = () => {
  webState.value = 'loading'
  clearWebTimer()
  webTimer = window.setTimeout(() => {
    if (webState.value !== 'ready') {
      webState.value = 'failed'
    }
  }, (Number.isFinite(config.value.webTimeoutSec) ? config.value.webTimeoutSec : 8) * 1000)
}

const stepNext = () => {
  const playlist = config.value.playlist
  if (playlist.length === 0) {
    enterSafeMode('Playlist is empty.')
    return
  }

  if (config.value.shuffle) {
    currentIndex.value = Math.floor(Math.random() * playlist.length)
    return
  }

  if (currentIndex.value + 1 < playlist.length) {
    currentIndex.value += 1
    return
  }

  if (config.value.loop) {
    currentIndex.value = 0
    return
  }

  enterSafeMode('Playback completed.')
}

const startPlaybackForItem = (item: PlaylistItem | null) => {
  clearPlaybackTimer()
  clearWebTimer()
  if (!item) {
    enterSafeMode('Playlist is empty.')
    return
  }

  safeModeMessage.value = ''
  webState.value = item.type === 'web' ? 'loading' : 'ready'

  if (item.type === 'video') {
    if (item.durationSec) {
      scheduleNext(item.durationSec * 1000)
    } else {
      clearPlaybackTimer()
    }
    return
  }

  if (item.type === 'web') {
    startWebTimeout()
  }

  const duration = item.durationSec ?? (Number.isFinite(config.value.defaultDurationSec) ? config.value.defaultDurationSec : 10)
  scheduleNext(duration * 1000)
}

const onVideoEnded = () => {
  stepNext()
}

const onMediaError = () => {
  enterSafeMode('Failed to load asset.')
}

const onWebLoaded = () => {
  webState.value = 'ready'
}

const applyConfig = (next: PlayerConfig) => {
  config.value = next
  privacyEnabled.value = next.mode === 'privacy'
  if (currentIndex.value >= next.playlist.length) {
    currentIndex.value = 0
  }
  startPlaybackForItem(currentItem.value)
}

const startHeartbeat = () => {
  heartbeatTimer = window.setInterval(() => {
    api.player.heartbeat()
  }, 5000)
}

watch(currentIndex, () => {
  startPlaybackForItem(currentItem.value)
})

onMounted(async () => {
  applyConfig(await api.config.get())
  removeConfigListener = api.config.onUpdated((next) => {
    applyConfig(next)
  })
  removePrivacyListener = api.player.onPrivacy((enabled) => {
    privacyEnabled.value = enabled
  })

  startHeartbeat()
})

onBeforeUnmount(() => {
  clearPlaybackTimer()
  clearWebTimer()
  removeConfigListener?.()
  removePrivacyListener?.()
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer)
  }
})
</script>

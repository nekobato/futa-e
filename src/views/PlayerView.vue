<template>
  <div class="player-stage">
    <div
      class="player-media"
      v-if="displayEnabled && !overlayVisible && !safeMode"
    >
      <img
        v-if="currentItem?.type === 'image'"
        :src="currentSource"
        :alt="currentItem?.title"
        @error="onMediaError"
      />
      <video
        v-else-if="currentItem?.type === 'video'"
        :src="currentSource"
        :muted="currentItem?.mute ?? false"
        autoplay
        playsinline
        @ended="onVideoEnded"
        @error="onMediaError"
      />
      <iframe
        v-else-if="currentItem?.type === 'web'"
        :src="currentSource"
        @load="onWebLoaded"
      ></iframe>
    </div>

    <div v-if="!displayEnabled" class="player-overlay">
      <div>
        <h2>Display Disabled</h2>
        <p>This monitor is currently disabled.</p>
      </div>
    </div>

    <div v-else-if="overlayVisible" class="player-overlay">
      <div>
        <img
          v-if="overlayImageSource"
          :src="overlayImageSource"
          :alt="effectiveDisplay.overlay.title"
        />
        <h2>{{ effectiveDisplay.overlay.title }}</h2>
        <p>{{ effectiveDisplay.overlay.message }}</p>
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getFutaeApi } from '../shared/api'
import { createDefaultConfig } from '../shared/defaults'
import { getEffectiveDisplayConfig } from '../shared/player-config'
import {
  createPlaybackOrder,
  firstPlayablePointer,
  nextPlayablePointer
} from '../shared/playback'
import type { PlayerConfig, PlaylistItem } from '../shared/types'

const api = getFutaeApi()
const displayId = new URLSearchParams(window.location.search).get('displayId')

const config = ref<PlayerConfig>(createDefaultConfig())
const currentIndex = ref(0)
const safeModeMessage = ref('')
const runtimeOverlayEnabled = ref(false)
const webState = ref<'loading' | 'ready' | 'failed'>('ready')
const playbackOrder = ref<number[]>([])
const orderPointer = ref(0)

const failedIndices = new Set<number>()

let playbackTimer: number | null = null
let webTimer: number | null = null
let heartbeatTimer: number | null = null
let removeConfigListener: (() => void) | null = null
let removeOverlayListener: (() => void) | null = null

const safeModeUrl = new URL('/safe-mode.svg', window.location.origin).toString()

const effectiveDisplay = computed(() =>
  getEffectiveDisplayConfig(config.value, displayId)
)
const displayEnabled = computed(() => effectiveDisplay.value.enabled)
const activePlaylist = computed(() => effectiveDisplay.value.playlist)
const currentItem = computed(
  () => activePlaylist.value[currentIndex.value] ?? null
)
const safeMode = computed(() => Boolean(safeModeMessage.value))
const overlayVisible = computed(() => runtimeOverlayEnabled.value)
const showWebFallback = computed(
  () => currentItem.value?.type === 'web' && webState.value === 'failed'
)

const resolveSource = (src: string): string => {
  if (!src) {
    return ''
  }
  if (
    src.startsWith('http') ||
    src.startsWith('file://') ||
    src.startsWith('/')
  ) {
    return src
  }
  return api.utils.toFileUrl(src)
}

const currentSource = computed(() =>
  currentItem.value ? resolveSource(currentItem.value.src) : ''
)
const fallbackSource = computed(() => {
  if (!currentItem.value?.fallbackSrc) {
    return safeModeUrl
  }
  return resolveSource(currentItem.value.fallbackSrc)
})
const overlayImageSource = computed(() =>
  effectiveDisplay.value.overlay.imageSrc
    ? resolveSource(effectiveDisplay.value.overlay.imageSrc)
    : ''
)

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
  }, config.value.webTimeoutSec * 1000)
}

const startPlaybackForItem = (item: PlaylistItem | null) => {
  clearPlaybackTimer()
  clearWebTimer()

  if (!displayEnabled.value) {
    safeModeMessage.value = ''
    return
  }

  if (!item) {
    enterSafeMode('Playlist is empty.')
    return
  }

  safeModeMessage.value = ''
  webState.value = item.type === 'web' ? 'loading' : 'ready'

  if (item.type === 'video') {
    if (item.durationSec) {
      scheduleNext(item.durationSec * 1000)
    }
    return
  }

  if (item.type === 'web') {
    startWebTimeout()
  }

  scheduleNext((item.durationSec ?? config.value.defaultDurationSec) * 1000)
}

const selectPointer = (pointer: number | null) => {
  if (pointer === null) {
    enterSafeMode('No playable items remain.')
    return
  }

  orderPointer.value = pointer
  currentIndex.value = playbackOrder.value[pointer] ?? 0
  startPlaybackForItem(currentItem.value)
}

const resetPlayback = () => {
  clearPlaybackTimer()
  clearWebTimer()
  failedIndices.clear()

  if (!displayEnabled.value) {
    safeModeMessage.value = ''
    webState.value = 'ready'
    return
  }

  if (activePlaylist.value.length === 0) {
    enterSafeMode('Playlist is empty.')
    return
  }

  playbackOrder.value = createPlaybackOrder(
    activePlaylist.value.length,
    config.value.shuffle
  )
  selectPointer(firstPlayablePointer(playbackOrder.value, failedIndices))
}

const moveToNextItem = (preserveFailures = false) => {
  if (!displayEnabled.value) {
    clearPlaybackTimer()
    clearWebTimer()
    return
  }

  if (!preserveFailures) {
    failedIndices.clear()
  }

  const nextPointer = nextPlayablePointer(
    playbackOrder.value,
    orderPointer.value,
    failedIndices
  )
  if (nextPointer !== null) {
    selectPointer(nextPointer)
    return
  }

  if (!config.value.loop) {
    enterSafeMode(
      preserveFailures ? 'No playable items remain.' : 'Playback completed.'
    )
    return
  }

  playbackOrder.value = createPlaybackOrder(
    activePlaylist.value.length,
    config.value.shuffle
  )
  selectPointer(firstPlayablePointer(playbackOrder.value, failedIndices))
}

const stepNext = () => {
  moveToNextItem(false)
}

const onVideoEnded = () => {
  stepNext()
}

const onMediaError = () => {
  failedIndices.add(currentIndex.value)

  if (failedIndices.size >= activePlaylist.value.length) {
    enterSafeMode('No playable items remain.')
    return
  }

  moveToNextItem(true)
}

const onWebLoaded = () => {
  webState.value = 'ready'
}

const applyConfig = (next: PlayerConfig) => {
  config.value = next
  resetPlayback()
}

const startHeartbeat = () => {
  heartbeatTimer = window.setInterval(() => {
    api.player.heartbeat()
  }, 5000)
}

onMounted(async () => {
  applyConfig(await api.config.get())
  removeConfigListener = api.config.onUpdated((next) => {
    applyConfig(next)
  })
  removeOverlayListener = api.player.onOverlay((enabled) => {
    runtimeOverlayEnabled.value = enabled
  })

  const status = await api.player.status()
  runtimeOverlayEnabled.value = status.overlayEnabled
  startHeartbeat()
})

onBeforeUnmount(() => {
  clearPlaybackTimer()
  clearWebTimer()
  removeConfigListener?.()
  removeOverlayListener?.()
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer)
  }
})
</script>

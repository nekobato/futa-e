<template>
  <div class="player-stage">
    <div
      class="player-media"
      v-if="!missingDisplayTarget && displayEnabled && !safeMode"
    >
      <img
        v-if="currentItem?.type === 'image'"
        :src="currentSource"
        :alt="currentItemAlt"
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

    <div v-if="missingDisplayTarget" class="player-overlay">
      <div>
        <h2>利用できません</h2>
        <p>
          このプレイリストはモニター個別設定です。対象ディスプレイを検出できないため、再生できません。
        </p>
      </div>
    </div>

    <div v-else-if="!displayEnabled" class="player-overlay">
      <div>
        <h2>表示停止中</h2>
        <p>このディスプレイは現在無効です。</p>
      </div>
    </div>

    <div v-else-if="safeMode" class="player-overlay">
      <div>
        <img :src="safeModeUrl" alt="セーフモード" />
        <h2>セーフモード</h2>
        <p>{{ safeModeMessage }}</p>
      </div>
    </div>

    <div v-else-if="showWebFallback" class="player-overlay">
      <div>
        <img :src="fallbackSource" alt="フォールバック表示" />
        <h2>Web フォールバック</h2>
        <p>
          Web
          コンテンツの読込がタイムアウトしたため、フォールバックへ切り替えました。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getFutaeApi } from '../shared/api'
import { createDefaultConfig } from '../shared/defaults'
import {
  getActivePlaylist,
  getEffectiveDisplayConfig
} from '../shared/player-config'
import {
  createPlaybackOrder,
  firstPlayablePointer,
  nextPlayablePointer
} from '../shared/playback'
import type { DisplayInfo, PlayerConfig, PlaylistItem } from '../shared/types'
import { isLikelyLocalFilePath, titleFromPath } from '../shared/utils'

const api = getFutaeApi()
const displayId = new URLSearchParams(window.location.search).get('displayId')

const config = ref<PlayerConfig>(createDefaultConfig())
const detectedDisplays = ref<DisplayInfo[]>([])
const currentIndex = ref(0)
const safeModeMessage = ref('')
const webState = ref<'loading' | 'ready' | 'failed'>('ready')
const playbackOrder = ref<number[]>([])
const orderPointer = ref(0)

const failedIndices = new Set<number>()

let playbackTimer: number | null = null
let webTimer: number | null = null
let heartbeatTimer: number | null = null
let removeConfigListener: (() => void) | null = null
let removeDisplayListener: (() => void) | null = null

const safeModeUrl = new URL('/safe-mode.svg', window.location.origin).toString()

const effectiveDisplay = computed(() =>
  getEffectiveDisplayConfig(config.value, displayId)
)
const activePlaylistConfig = computed(() => getActivePlaylist(config.value))
const effectiveActivePlaylistConfig = computed(() =>
  getActivePlaylist({
    activePlaylistId: config.value.activePlaylistId,
    playlists: effectiveDisplay.value.playlists
  })
)
const missingDisplayTarget = computed(
  () =>
    activePlaylistConfig.value.perDisplay &&
    (!displayId ||
      !detectedDisplays.value.some((display) => display.id === displayId))
)
const displayEnabled = computed(
  () => !missingDisplayTarget.value && effectiveDisplay.value.enabled
)
const activePlaylist = computed(() => effectiveActivePlaylistConfig.value.items)
const currentItem = computed(
  () => activePlaylist.value[currentIndex.value] ?? null
)
const currentItemAlt = computed(() =>
  currentItem.value
    ? titleFromPath(currentItem.value.originUrl ?? currentItem.value.src)
    : 'プレイリスト項目'
)
const safeMode = computed(() => Boolean(safeModeMessage.value))
const showWebFallback = computed(
  () => currentItem.value?.type === 'web' && webState.value === 'failed'
)

const resolveSource = (src: string): string => {
  if (!src) {
    return ''
  }
  if (isLikelyLocalFilePath(src)) {
    return api.utils.toFileUrl(src)
  }
  if (
    src.startsWith('http') ||
    src.startsWith('blob:') ||
    src.startsWith('data:') ||
    src.startsWith('file://') ||
    src.startsWith('futae-media://') ||
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
  }, effectiveActivePlaylistConfig.value.webTimeoutSec * 1000)
}

const startPlaybackForItem = (item: PlaylistItem | null) => {
  clearPlaybackTimer()
  clearWebTimer()

  if (missingDisplayTarget.value) {
    safeModeMessage.value = ''
    webState.value = 'ready'
    return
  }

  if (!displayEnabled.value) {
    safeModeMessage.value = ''
    return
  }

  if (!item) {
    enterSafeMode('プレイリストが空です。')
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

  scheduleNext(
    (item.durationSec ??
      effectiveActivePlaylistConfig.value.defaultDurationSec) * 1000
  )
}

const selectPointer = (pointer: number | null) => {
  if (pointer === null) {
    enterSafeMode('再生可能な項目がありません。')
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

  if (missingDisplayTarget.value) {
    safeModeMessage.value = ''
    webState.value = 'ready'
    return
  }

  if (!displayEnabled.value) {
    safeModeMessage.value = ''
    webState.value = 'ready'
    return
  }

  if (activePlaylist.value.length === 0) {
    enterSafeMode('プレイリストが空です。')
    return
  }

  playbackOrder.value = createPlaybackOrder(
    activePlaylist.value.length,
    effectiveActivePlaylistConfig.value.shuffle
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

  if (!effectiveActivePlaylistConfig.value.loop) {
    enterSafeMode(
      preserveFailures ? '再生可能な項目がありません。' : '再生が完了しました。'
    )
    return
  }

  playbackOrder.value = createPlaybackOrder(
    activePlaylist.value.length,
    effectiveActivePlaylistConfig.value.shuffle
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
    enterSafeMode('再生可能な項目がありません。')
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

const syncDisplays = (displays: DisplayInfo[]) => {
  detectedDisplays.value = displays
  resetPlayback()
}

const startHeartbeat = () => {
  heartbeatTimer = window.setInterval(() => {
    api.player.heartbeat()
  }, 5000)
}

onMounted(async () => {
  syncDisplays(await api.displays.list())
  applyConfig(await api.config.getPlayback())
  removeConfigListener = api.config.onUpdated((next) => {
    applyConfig(next)
  })
  removeDisplayListener = api.displays.onChanged((displays) => {
    syncDisplays(displays)
  })
  startHeartbeat()
})

onBeforeUnmount(() => {
  clearPlaybackTimer()
  clearWebTimer()
  removeConfigListener?.()
  removeDisplayListener?.()
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer)
  }
})
</script>

<style lang="scss">
.player-stage {
  width: 100vw;
  height: 100vh;
  background: #0b0b0b;
  position: relative;
  overflow: hidden;
}

.player-media {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;

  img,
  video,
  iframe {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border: none;
  }
}

.player-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  text-align: center;
  padding: 40px;

  img {
    width: min(420px, 60vw);
    margin-bottom: 20px;
  }
}
</style>

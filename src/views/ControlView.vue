<template>
  <div class="control-layout">
    <div class="control-hero">
      <div>
        <h1>Futa-e Player</h1>
        <p>Local-only lid display player.</p>
      </div>
      <div class="row">
        <Tag v-if="dirty" value="Unsaved" severity="warning" />
        <Button label="Reload" icon="pi pi-refresh" severity="secondary" @click="loadConfig" />
        <Button label="Save" icon="pi pi-save" :disabled="!dirty" @click="saveConfig" />
      </div>
    </div>

    <Card class="panel-card">
      <template #title>Playback</template>
      <template #content>
        <div class="panel-content">
          <div class="row">
            <label>Mode</label>
            <Select
              v-model="config.mode"
              :options="modeOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
              @update:modelValue="markDirty"
            />
          </div>
          <div class="row">
            <label>Loop</label>
            <ToggleSwitch v-model="config.loop" @update:modelValue="markDirty" />
            <label>Shuffle</label>
            <ToggleSwitch v-model="config.shuffle" @update:modelValue="markDirty" />
          </div>
          <div class="row">
            <label>Default Duration (sec)</label>
            <InputNumber v-model="config.defaultDurationSec" :min="2" :max="36000" @update:modelValue="markDirty" />
          </div>
          <div class="row">
            <label>Web Timeout (sec)</label>
            <InputNumber v-model="config.webTimeoutSec" :min="2" :max="120" @update:modelValue="markDirty" />
          </div>
        </div>
      </template>
    </Card>

    <Card class="panel-card">
      <template #title>Assets</template>
      <template #content>
        <div class="panel-content">
          <div class="row">
            <Button label="Add Files" icon="pi pi-images" severity="secondary" @click="addFiles" />
            <Button label="Add Folder" icon="pi pi-folder-open" severity="secondary" @click="addFolder" />
          </div>
          <Divider />
          <div class="row">
            <label>URL</label>
            <InputText v-model="urlInput" placeholder="https://example.com/asset" class="w-full" />
          </div>
          <div class="row">
            <label>Type</label>
            <Select
              v-model="urlType"
              :options="typeOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
            <label>Duration (sec)</label>
            <InputNumber v-model="urlDuration" :min="2" :max="36000" placeholder="auto" />
          </div>
          <div class="row">
            <Button label="Pick Fallback" icon="pi pi-image" severity="secondary" @click="pickFallback" />
            <span class="playlist-meta">{{ fallbackLabel }}</span>
          </div>
          <Button label="Add URL" icon="pi pi-plus" @click="addUrl" />
        </div>
      </template>
    </Card>

    <Card class="panel-card">
      <template #title>Playlist</template>
      <template #content>
        <div class="panel-content">
          <p v-if="config.playlist.length === 0" class="playlist-meta">
            No items yet. Add assets to begin.
          </p>
          <div v-else class="playlist-list">
            <div v-for="(item, index) in config.playlist" :key="item.id" class="playlist-item">
              <div class="playlist-item-header">
                <strong>{{ item.title }}</strong>
                <Tag :value="item.type.toUpperCase()" />
              </div>
              <div class="playlist-meta">
                {{ item.originUrl ? 'cached: ' + item.originUrl : item.src }}
              </div>
              <div class="playlist-meta">Duration: {{ item.durationSec ?? 'auto' }} sec</div>
              <div class="row">
                <Button icon="pi pi-arrow-up" text severity="secondary" @click="moveItem(index, -1)" />
                <Button icon="pi pi-arrow-down" text severity="secondary" @click="moveItem(index, 1)" />
                <Button icon="pi pi-trash" text severity="danger" @click="removeItem(index)" />
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <Card class="panel-card">
      <template #title>Player</template>
      <template #content>
        <div class="panel-content">
          <div class="row">
            <Tag :value="statusLabel" severity="info" />
            <span class="playlist-meta">Displays: {{ status.displayCount }}</span>
          </div>
          <div class="row">
            <Button label="Start" icon="pi pi-play" severity="success" @click="startPlayer" />
            <Button label="Stop" icon="pi pi-stop" severity="secondary" @click="stopPlayer" />
            <Button
              :label="privacyEnabled ? 'Privacy On' : 'Privacy Off'"
              icon="pi pi-eye-slash"
              severity="secondary"
              @click="togglePrivacy"
            />
          </div>
          <p class="playlist-meta">Hotkey: CommandOrControl + Shift + P</p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AssetType, PickedAsset, PlayerConfig, PlayerStatus, PlaylistItem } from '../shared/types'
import { createDefaultConfig } from '../shared/defaults'
import { createId, titleFromPath } from '../shared/utils'

const api = window.futae

const config = ref<PlayerConfig>(createDefaultConfig())
const status = ref<PlayerStatus>({ running: false, displayCount: 0 })
const dirty = ref(false)
const privacyEnabled = ref(false)

const urlInput = ref('')
const urlType = ref<AssetType>('image')
const urlDuration = ref<number | null>(null)
const urlFallback = ref<string | null>(null)

const modeOptions = [
  { label: 'Signage', value: 'signage' },
  { label: 'Decor', value: 'decor' },
  { label: 'Privacy', value: 'privacy' }
]

const typeOptions = [
  { label: 'Image', value: 'image' },
  { label: 'Video', value: 'video' },
  { label: 'Web', value: 'web' }
]

const fallbackLabel = computed(() => (urlFallback.value ? titleFromPath(urlFallback.value) : 'No fallback'))
const statusLabel = computed(() => (status.value.running ? 'Running' : 'Stopped'))

const markDirty = () => {
  dirty.value = true
}

const loadConfig = async () => {
  config.value = await api.config.get()
  dirty.value = false
  privacyEnabled.value = config.value.mode === 'privacy'
  status.value = await api.player.status()
}

const saveConfig = async () => {
  config.value = await api.config.save({
    ...config.value,
    updatedAt: new Date().toISOString()
  })
  dirty.value = false
  privacyEnabled.value = config.value.mode === 'privacy'
}

const buildItem = (asset: PickedAsset): PlaylistItem => ({
  id: createId(),
  type: asset.type,
  title: titleFromPath(asset.path),
  src: asset.path,
  durationSec:
    asset.type === 'video'
      ? undefined
      : Number.isFinite(config.value.defaultDurationSec)
        ? config.value.defaultDurationSec
        : 10,
  mute: false
})

const addPickedAssets = (assets: PickedAsset[]) => {
  if (assets.length === 0) {
    return
  }
  const items = assets.map(buildItem)
  config.value.playlist = [...config.value.playlist, ...items]
  markDirty()
}

const addFiles = async () => {
  const assets = await api.assets.pickFiles({ kind: 'media' })
  addPickedAssets(assets)
}

const addFolder = async () => {
  const assets = await api.assets.pickFolder()
  addPickedAssets(assets)
}

const pickFallback = async () => {
  const assets = await api.assets.pickFiles({ kind: 'image' })
  urlFallback.value = assets[0]?.path ?? null
}

const addUrl = async () => {
  const trimmed = urlInput.value.trim()
  if (!trimmed) {
    return
  }

  let src = trimmed
  let originUrl: string | undefined

  if (urlType.value !== 'web' && trimmed.startsWith('http')) {
    const cached = await api.assets.cacheRemote(trimmed, urlType.value)
    if (cached) {
      src = cached.localPath
      originUrl = cached.originalUrl
    }
  }

  const item: PlaylistItem = {
    id: createId(),
    type: urlType.value,
    title: trimmed,
    src,
    originUrl,
    durationSec:
      urlType.value === 'video'
        ? undefined
        : urlDuration.value ?? (Number.isFinite(config.value.defaultDurationSec) ? config.value.defaultDurationSec : 10),
    fallbackSrc: urlType.value === 'web' ? urlFallback.value ?? undefined : undefined
  }

  config.value.playlist = [...config.value.playlist, item]
  urlInput.value = ''
  urlDuration.value = null
  urlFallback.value = null
  markDirty()
}

const moveItem = (index: number, delta: number) => {
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= config.value.playlist.length) {
    return
  }
  const updated = [...config.value.playlist]
  const [moved] = updated.splice(index, 1)
  updated.splice(nextIndex, 0, moved)
  config.value.playlist = updated
  markDirty()
}

const removeItem = (index: number) => {
  const updated = [...config.value.playlist]
  updated.splice(index, 1)
  config.value.playlist = updated
  markDirty()
}

const startPlayer = async () => {
  if (dirty.value) {
    await saveConfig()
  }
  status.value = await api.player.start()
}

const stopPlayer = async () => {
  status.value = await api.player.stop()
}

const togglePrivacy = async () => {
  privacyEnabled.value = !privacyEnabled.value
  await api.player.setPrivacy(privacyEnabled.value)
}

onMounted(() => {
  loadConfig()
})
</script>

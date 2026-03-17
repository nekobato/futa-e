<template>
  <div class="control-layout">
    <div class="control-hero">
      <div>
        <h1>Futa-e Player</h1>
        <p>Local-only lid display player.</p>
      </div>
      <div class="row">
        <Tag v-if="dirty" value="Unsaved" severity="warning" />
        <Button
          label="Reload"
          icon="pi pi-refresh"
          severity="secondary"
          @click="loadConfig"
        />
        <Button
          label="Save"
          icon="pi pi-save"
          :disabled="!dirty"
          @click="saveConfig"
        />
      </div>
    </div>

    <Card class="panel-card">
      <template #title>Playback</template>
      <template #content>
        <div class="panel-content">
          <div class="row">
            <label>Loop</label>
            <ToggleSwitch
              v-model="config.loop"
              @update:modelValue="markDirty"
            />
            <label>Shuffle</label>
            <ToggleSwitch
              v-model="config.shuffle"
              @update:modelValue="markDirty"
            />
          </div>
          <div class="row">
            <label>Default Duration (sec)</label>
            <InputNumber
              v-model="config.defaultDurationSec"
              :min="2"
              :max="36000"
              @update:modelValue="markDirty"
            />
          </div>
          <div class="row">
            <label>Web Timeout (sec)</label>
            <InputNumber
              v-model="config.webTimeoutSec"
              :min="2"
              :max="120"
              @update:modelValue="markDirty"
            />
          </div>
        </div>
      </template>
    </Card>

    <Card class="panel-card">
      <template #title>Displays</template>
      <template #content>
        <div class="panel-content">
          <div class="row" data-testid="per-display-controls">
            <label>モニターを個別に設定する</label>
            <ToggleSwitch
              :modelValue="config.displayMode === 'per-display'"
              @update:modelValue="togglePerDisplay"
            />
          </div>
          <div class="playlist-meta">
            Detected displays: {{ displayInfos.length }}
          </div>
          <div v-if="displayInfos.length > 0" class="display-list">
            <div
              v-for="display in displayInfos"
              :key="display.id"
              class="display-summary"
            >
              <strong>{{ display.label }}</strong>
              <span class="playlist-meta">
                {{ display.bounds.width }} x {{ display.bounds.height }}
                <template v-if="display.isPrimary"> / Primary</template>
              </span>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <Card class="panel-card">
      <template #title>{{
        config.displayMode === 'mirror' ? 'Playlist' : 'Shared Playlist'
      }}</template>
      <template #content>
        <PlaylistEditor
          :playlist="config.playlist"
          :default-duration-sec="config.defaultDurationSec"
          @update:playlist="updateSharedPlaylist"
          @changed="markDirty"
        />
      </template>
    </Card>

    <Card class="panel-card">
      <template #title>{{
        config.displayMode === 'mirror' ? 'Overlay' : 'Shared Overlay'
      }}</template>
      <template #content>
        <OverlayEditor
          :overlay="config.overlay"
          @update:overlay="updateSharedOverlay"
          @changed="markDirty"
        />
      </template>
    </Card>

    <Card
      v-for="display in perDisplayInfos"
      :key="display.id"
      class="panel-card"
      :data-testid="`display-card-${display.id}`"
    >
      <template #title>
        <div class="display-card-header">
          <span>{{ display.label }}</span>
          <Tag
            :value="display.isPrimary ? 'PRIMARY' : 'DISPLAY'"
            severity="secondary"
          />
        </div>
      </template>
      <template #content>
        <div class="panel-content">
          <div class="row">
            <label>Enabled</label>
            <ToggleSwitch
              v-model="config.displays[display.id].enabled"
              @update:modelValue="markDirty"
            />
          </div>

          <div class="playlist-meta">
            {{ display.bounds.width }} x {{ display.bounds.height }}
          </div>

          <PlaylistEditor
            :playlist="config.displays[display.id].playlist"
            :default-duration-sec="config.defaultDurationSec"
            @update:playlist="
              (playlist) => updateDisplayPlaylist(display.id, playlist)
            "
            @changed="markDirty"
          />

          <Divider />

          <OverlayEditor
            :overlay="config.displays[display.id].overlay"
            @update:overlay="
              (overlay) => updateDisplayOverlay(display.id, overlay)
            "
            @changed="markDirty"
          />
        </div>
      </template>
    </Card>

    <Card class="panel-card">
      <template #title>Player</template>
      <template #content>
        <div class="panel-content">
          <div class="row">
            <Tag :value="statusLabel" severity="info" />
            <span class="playlist-meta"
              >Displays: {{ status.displayCount }}</span
            >
          </div>
          <div class="row">
            <Button
              label="Start"
              icon="pi pi-play"
              severity="success"
              @click="startPlayer"
            />
            <Button
              label="Stop"
              icon="pi pi-stop"
              severity="secondary"
              @click="stopPlayer"
            />
            <Button
              :label="overlayEnabled ? 'Overlay On' : 'Overlay Off'"
              icon="pi pi-eye-slash"
              severity="secondary"
              @click="toggleOverlay"
            />
          </div>
          <p class="playlist-meta">Hotkey: CommandOrControl + Shift + P</p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import OverlayEditor from '../components/OverlayEditor.vue'
import PlaylistEditor from '../components/PlaylistEditor.vue'
import { getFutaeApi } from '../shared/api'
import { createDefaultConfig } from '../shared/defaults'
import { ensureDisplayConfigs } from '../shared/player-config'
import type {
  DisplayInfo,
  OverlayConfig,
  PlayerConfig,
  PlayerStatus,
  PlaylistItem
} from '../shared/types'

const api = getFutaeApi()

const config = ref<PlayerConfig>(createDefaultConfig())
const displayInfos = ref<DisplayInfo[]>([])
const status = ref<PlayerStatus>({
  running: false,
  displayCount: 0,
  overlayEnabled: false
})
const dirty = ref(false)
const overlayEnabled = ref(false)

let removeOverlayListener: (() => void) | null = null

const statusLabel = computed(() =>
  status.value.running ? 'Running' : 'Stopped'
)
const perDisplayInfos = computed(() =>
  config.value.displayMode === 'per-display' ? displayInfos.value : []
)

const markDirty = () => {
  dirty.value = true
}

const refreshDisplays = async () => {
  displayInfos.value = await api.displays.list()
  config.value = ensureDisplayConfigs(config.value, displayInfos.value)
}

const loadConfig = async () => {
  config.value = await api.config.get()
  await refreshDisplays()
  dirty.value = false
  status.value = await api.player.status()
  overlayEnabled.value = status.value.overlayEnabled
}

const saveConfig = async () => {
  const prepared = ensureDisplayConfigs(
    {
      ...config.value,
      updatedAt: new Date().toISOString()
    },
    displayInfos.value
  )

  config.value = await api.config.save(prepared)
  dirty.value = false
}

const updateSharedPlaylist = (playlist: PlaylistItem[]) => {
  config.value = {
    ...config.value,
    playlist
  }
}

const updateSharedOverlay = (overlay: OverlayConfig) => {
  config.value = {
    ...config.value,
    overlay
  }
}

const updateDisplayPlaylist = (displayId: string, playlist: PlaylistItem[]) => {
  config.value = {
    ...config.value,
    displays: {
      ...config.value.displays,
      [displayId]: {
        ...config.value.displays[displayId],
        playlist
      }
    }
  }
}

const updateDisplayOverlay = (displayId: string, overlay: OverlayConfig) => {
  config.value = {
    ...config.value,
    displays: {
      ...config.value.displays,
      [displayId]: {
        ...config.value.displays[displayId],
        overlay
      }
    }
  }
}

const togglePerDisplay = (enabled: boolean) => {
  config.value = ensureDisplayConfigs(
    {
      ...config.value,
      displayMode: enabled ? 'per-display' : 'mirror'
    },
    displayInfos.value
  )
  markDirty()
}

const startPlayer = async () => {
  if (dirty.value) {
    await saveConfig()
  }
  status.value = await api.player.start()
  overlayEnabled.value = status.value.overlayEnabled
}

const stopPlayer = async () => {
  status.value = await api.player.stop()
  overlayEnabled.value = status.value.overlayEnabled
}

const toggleOverlay = async () => {
  overlayEnabled.value = !overlayEnabled.value
  await api.player.setOverlay(overlayEnabled.value)
}

onMounted(async () => {
  await loadConfig()
  removeOverlayListener = api.player.onOverlay((enabled) => {
    overlayEnabled.value = enabled
    status.value = {
      ...status.value,
      overlayEnabled: enabled
    }
  })
})

onBeforeUnmount(() => {
  removeOverlayListener?.()
})
</script>

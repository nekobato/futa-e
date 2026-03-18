<template>
  <div class="control-layout">
    <header class="control-hero">
      <div class="hero-copy">
        <p class="section-kicker">Local Control</p>
        <h1>Futa-e Player</h1>
        <p>Local-only lid display player.</p>
      </div>

      <div class="hero-toolbar">
        <div class="status-cluster">
          <Tag v-if="dirty" value="Unsaved" severity="warning" />
          <Tag :value="statusLabel" severity="info" />
          <span class="surface-note"
            >Detected {{ displayInfos.length }} displays</span
          >
          <span class="surface-note">Live: {{ status.displayCount }}</span>
        </div>

        <div class="action-cluster">
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
            :label="overlayEnabled ? 'Hide Overlay' : 'Show Overlay'"
            :icon="overlayEnabled ? 'pi pi-eye-slash' : 'pi pi-eye'"
            severity="secondary"
            @click="toggleOverlay"
          />
        </div>

        <p class="surface-note">Hotkey: CommandOrControl + Shift + P</p>
      </div>
    </header>

    <div class="control-surface">
      <section class="settings-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">System</p>
            <h2>Playback & Displays</h2>
          </div>
          <p class="section-copy">
            Tune shared playback defaults first, then decide whether each
            display should inherit or override them.
          </p>
        </div>

        <div class="settings-grid settings-grid-compact">
          <section class="settings-block">
            <header class="subsection-heading">
              <div>
                <h3>Playback</h3>
                <p>Global timing and playback behavior.</p>
              </div>
            </header>

            <div class="field-grid field-grid-2">
              <div class="field-inline">
                <label :for="loopInputId">Loop</label>
                <ToggleSwitch
                  :inputId="loopInputId"
                  v-model="config.loop"
                  @update:modelValue="markDirty"
                />
              </div>

              <div class="field-inline">
                <label :for="shuffleInputId">Shuffle</label>
                <ToggleSwitch
                  :inputId="shuffleInputId"
                  v-model="config.shuffle"
                  @update:modelValue="markDirty"
                />
              </div>
            </div>

            <div class="field-grid field-grid-2">
              <div class="field">
                <label :for="defaultDurationInputId">Default Duration (sec)</label>
                <InputNumber
                  :inputId="defaultDurationInputId"
                  v-model="config.defaultDurationSec"
                  :min="2"
                  :max="36000"
                  @update:modelValue="markDirty"
                />
              </div>

              <div class="field">
                <label :for="webTimeoutInputId">Web Timeout (sec)</label>
                <InputNumber
                  :inputId="webTimeoutInputId"
                  v-model="config.webTimeoutSec"
                  :min="2"
                  :max="120"
                  @update:modelValue="markDirty"
                />
              </div>
            </div>
          </section>

          <section class="settings-block">
            <header class="subsection-heading">
              <div>
                <h3>Displays</h3>
                <p>Connected outputs and override mode.</p>
              </div>
            </header>

            <div class="field-inline" data-testid="per-display-controls">
              <div class="field-copy">
                <label :for="perDisplayInputId">モニターを個別に設定する</label>
                <p class="surface-note">
                  Shared playlist and overlay stay below. Display-specific
                  editors appear only when needed.
                </p>
              </div>
              <ToggleSwitch
                :inputId="perDisplayInputId"
                :modelValue="config.displayMode === 'per-display'"
                @update:modelValue="togglePerDisplay"
              />
            </div>

            <div v-if="displayInfos.length > 0" class="display-list">
              <div
                v-for="display in displayInfos"
                :key="display.id"
                class="display-summary"
              >
                <div class="display-copy">
                  <strong>{{ display.label }}</strong>
                  <span class="surface-note">
                    {{ display.bounds.width }} x {{ display.bounds.height }}
                  </span>
                </div>
                <Tag
                  :value="display.isPrimary ? 'PRIMARY' : 'DISPLAY'"
                  severity="secondary"
                />
              </div>
            </div>
          </section>
        </div>
      </section>

      <Divider />

      <section class="settings-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Shared Defaults</p>
            <h2>Playlist & Overlay</h2>
          </div>
          <p class="section-copy">
            These settings are applied to every display unless a display
            override is opened below.
          </p>
        </div>

        <div class="settings-grid content-grid">
          <section class="settings-block">
            <header class="subsection-heading">
              <div>
                <h3>{{
                  config.displayMode === 'mirror' ? 'Playlist' : 'Shared Playlist'
                }}</h3>
                <p>Base media queue for all displays.</p>
              </div>
            </header>

            <PlaylistEditor
              :playlist="config.playlist"
              :default-duration-sec="config.defaultDurationSec"
              @update:playlist="updateSharedPlaylist"
              @changed="markDirty"
            />
          </section>

          <section class="settings-block">
            <header class="subsection-heading">
              <div>
                <h3>{{
                  config.displayMode === 'mirror' ? 'Overlay' : 'Shared Overlay'
                }}</h3>
                <p>Fallback cover shown whenever overlay mode is active.</p>
              </div>
            </header>

            <OverlayEditor
              :overlay="config.overlay"
              @update:overlay="updateSharedOverlay"
              @changed="markDirty"
            />
          </section>
        </div>
      </section>

      <template v-if="perDisplayInfos.length > 0">
        <Divider />

        <section class="settings-section">
          <div class="section-heading">
            <div>
              <p class="section-kicker">Overrides</p>
              <h2>Per-Display Settings</h2>
            </div>
            <p class="section-copy">
              Open only the displays you want to diverge. Hidden panels stay out
              of the way.
            </p>
          </div>

          <Accordion
            :value="openDisplayPanels"
            multiple
            lazy
            class="display-accordion"
            @update:value="updateOpenDisplayPanels"
          >
            <AccordionPanel
              v-for="display in perDisplayInfos"
              :key="display.id"
              :value="display.id"
              :data-testid="`display-card-${display.id}`"
            >
              <AccordionHeader>
                <div class="display-accordion-header">
                  <div class="display-copy">
                    <strong>{{ display.label }}</strong>
                    <span class="surface-note">
                      {{ display.bounds.width }} x {{ display.bounds.height }}
                    </span>
                  </div>

                  <div class="display-accordion-meta">
                    <Tag
                      :value="
                        config.displays[display.id].enabled
                          ? 'ENABLED'
                          : 'DISABLED'
                      "
                      :severity="
                        config.displays[display.id].enabled
                          ? 'success'
                          : 'secondary'
                      "
                    />
                    <Tag
                      :value="display.isPrimary ? 'PRIMARY' : 'DISPLAY'"
                      severity="secondary"
                    />
                  </div>
                </div>
              </AccordionHeader>

              <AccordionContent>
                <div class="display-panel-body">
                  <div class="field-inline">
                    <div class="field-copy">
                      <label :for="displayEnabledInputId(display.id)"
                        >Enabled</label
                      >
                      <p class="surface-note">
                        Disable playback on this display without discarding its
                        override settings.
                      </p>
                    </div>
                    <ToggleSwitch
                      :inputId="displayEnabledInputId(display.id)"
                      v-model="config.displays[display.id].enabled"
                      @update:modelValue="markDirty"
                    />
                  </div>

                  <div class="settings-grid content-grid">
                    <section class="settings-block settings-block-embedded">
                      <header class="subsection-heading">
                        <div>
                          <h3>Playlist</h3>
                          <p>Only for {{ display.label }}.</p>
                        </div>
                      </header>

                      <PlaylistEditor
                        :playlist="config.displays[display.id].playlist"
                        :default-duration-sec="config.defaultDurationSec"
                        @update:playlist="
                          (playlist) => updateDisplayPlaylist(display.id, playlist)
                        "
                        @changed="markDirty"
                      />
                    </section>

                    <section class="settings-block settings-block-embedded">
                      <header class="subsection-heading">
                        <div>
                          <h3>Overlay</h3>
                          <p>Only for {{ display.label }}.</p>
                        </div>
                      </header>

                      <OverlayEditor
                        :overlay="config.displays[display.id].overlay"
                        @update:overlay="
                          (overlay) => updateDisplayOverlay(display.id, overlay)
                        "
                        @changed="markDirty"
                      />
                    </section>
                  </div>
                </div>
              </AccordionContent>
            </AccordionPanel>
          </Accordion>
        </section>
      </template>
    </div>
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

const loopInputId = 'control-loop'
const shuffleInputId = 'control-shuffle'
const defaultDurationInputId = 'control-default-duration'
const webTimeoutInputId = 'control-web-timeout'
const perDisplayInputId = 'control-per-display'

const config = ref<PlayerConfig>(createDefaultConfig())
const displayInfos = ref<DisplayInfo[]>([])
const status = ref<PlayerStatus>({
  running: false,
  displayCount: 0,
  overlayEnabled: false
})
const dirty = ref(false)
const overlayEnabled = ref(false)
const openDisplayPanels = ref<string[]>([])

let removeOverlayListener: (() => void) | null = null
let removeDisplayListener: (() => void) | null = null

const statusLabel = computed(() =>
  status.value.running ? 'Running' : 'Stopped'
)
const perDisplayInfos = computed(() =>
  config.value.displayMode === 'per-display' ? displayInfos.value : []
)

const markDirty = () => {
  dirty.value = true
}

const displayEnabledInputId = (displayId: string) =>
  `display-enabled-${displayId}`

const setOpenDisplayPanels = (
  value: string | number | Array<string | number> | null | undefined
) => {
  openDisplayPanels.value = Array.isArray(value)
    ? value.map(String)
    : value === null || value === undefined
      ? []
      : [String(value)]
}

const syncOpenDisplayPanels = (displays: DisplayInfo[]) => {
  const nextIds = new Set(displays.map((display) => display.id))
  const nextOpenPanels = openDisplayPanels.value.filter((panelId) =>
    nextIds.has(panelId)
  )

  if (
    config.value.displayMode === 'per-display' &&
    nextOpenPanels.length === 0 &&
    displays[0]
  ) {
    nextOpenPanels.push(displays[0].id)
  }

  openDisplayPanels.value = nextOpenPanels
}

const syncDisplays = (displays: DisplayInfo[]) => {
  displayInfos.value = displays
  config.value = ensureDisplayConfigs(config.value, displays)
  syncOpenDisplayPanels(displays)
}

const refreshDisplays = async () => {
  syncDisplays(await api.displays.list())
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

const updateOpenDisplayPanels = (
  value: string | number | Array<string | number> | null | undefined
) => {
  setOpenDisplayPanels(value)
}

const togglePerDisplay = (enabled: boolean) => {
  config.value = ensureDisplayConfigs(
    {
      ...config.value,
      displayMode: enabled ? 'per-display' : 'mirror'
    },
    displayInfos.value
  )

  if (enabled && openDisplayPanels.value.length === 0 && displayInfos.value[0]) {
    openDisplayPanels.value = [displayInfos.value[0].id]
  }

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
  removeDisplayListener = api.displays.onChanged((displays) => {
    syncDisplays(displays)
  })
  removeOverlayListener = api.player.onOverlay((enabled) => {
    overlayEnabled.value = enabled
    status.value = {
      ...status.value,
      overlayEnabled: enabled
    }
  })
})

onBeforeUnmount(() => {
  removeDisplayListener?.()
  removeOverlayListener?.()
})
</script>

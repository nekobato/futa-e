<template>
  <div class="control-layout">
    <header class="control-pagebar">
      <h1 class="control-pagebar-title">Futa E</h1>
      <Button
        label="開始"
        icon="pi pi-play"
        size="small"
        severity="contrast"
        :disabled="!isConfigReady"
        @click="handleStartPlayer"
      />
    </header>

    <div v-if="isConfigReady" class="control-canvas">
      <main class="settings-main">
        <DisplaySettingsPanel
          :display-infos="displayInfos"
          :displays="config.displays"
          @toggle-display="setDisplayEnabled"
        />

        <PlaylistWorkbenchSection
          :config="config"
          :display-infos="displayInfos"
          :selected-playlist="selectedPlaylist"
          :selected-playlist-index="selectedPlaylistIndex"
          :selected-playlist-scope="selectedPlaylistScope"
          @add-playlist="addPlaylist"
          @duplicate-selected-playlist="duplicateSelectedPlaylist"
          @move-selected-playlist="moveSelectedPlaylist"
          @remove-selected-playlist="removeSelectedPlaylist"
          @rename-selected-playlist="renameSelectedPlaylist"
          @select-playlist="selectPlaylist"
          @set-active-playlist="setActivePlaylist"
          @set-display-enabled="setDisplayEnabled"
          @toggle-selected-playlist-per-display="
            toggleSelectedPlaylistPerDisplay
          "
          @update-selected-display-playlist="updateSelectedDisplayPlaylist"
          @update-selected-playlist-default-duration="
            updateSelectedPlaylistDefaultDuration
          "
          @update-selected-playlist-scope="updateSelectedPlaylistScope"
          @update-selected-playlist-settings="updateSelectedPlaylistSettings"
          @update-selected-playlist-web-timeout="
            updateSelectedPlaylistWebTimeout
          "
          @update-selected-shared-playlist="updateSelectedSharedPlaylist"
        />
      </main>
    </div>

    <div v-else class="control-surface control-surface-loading">
      <p class="surface-note">設定を読み込んでおります。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import DisplaySettingsPanel from '../components/control/DisplaySettingsPanel.vue'
import PlaylistWorkbenchSection from '../components/control/PlaylistWorkbenchSection.vue'
import { useControlView } from '../composables/useControlView'

const {
  addPlaylist,
  config,
  enabledDisplayCount,
  displayInfos,
  duplicateSelectedPlaylist,
  isConfigReady,
  moveSelectedPlaylist,
  removeSelectedPlaylist,
  renameSelectedPlaylist,
  selectPlaylist,
  selectedPlaylist,
  selectedPlaylistIndex,
  selectedPlaylistScope,
  setActivePlaylist,
  setDisplayEnabled,
  startPlayer,
  toggleSelectedPlaylistPerDisplay,
  updateSelectedDisplayPlaylist,
  updateSelectedPlaylistDefaultDuration,
  updateSelectedPlaylistScope,
  updateSelectedPlaylistSettings,
  updateSelectedPlaylistWebTimeout,
  updateSelectedSharedPlaylist
} = useControlView()

const toast = useToast()

/** Prevents player launch when every display has been disabled in settings. */
const handleStartPlayer = async () => {
  if (enabledDisplayCount.value === 0) {
    toast.add({
      severity: 'warn',
      summary: '開始できません',
      detail: '少なくとも一つのDisplayを有効にしてください',
      life: 3000
    })
    return
  }

  await startPlayer()
}
</script>

<style lang="scss">
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.control-layout {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 20px;
  width: min(1320px, 100%);
  animation: rise 480ms ease-out;

  .control-pagebar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    padding: 0 10px;

    &-title {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(34px, 4vw, 52px);
      line-height: 0.92;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
  }

  .control-canvas {
    display: grid;
    gap: 24px;
    padding: 24px 26px 28px;
    border-radius: 30px;
    border: 1px solid var(--line-strong);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--panel), white 52%),
      color-mix(in srgb, var(--panel), white 34%)
    );
    box-shadow: var(--shadow);
  }

  .settings-main {
    min-width: 0;
    display: grid;
    gap: 24px;
  }

  .control-surface {
    display: grid;
    gap: 18px;
    padding: 24px 28px;
    border-radius: 26px;
    background: var(--panel);
    border: 1px solid var(--line-subtle);
    box-shadow: var(--shadow);

    &-loading {
      justify-items: center;
      min-height: 320px;
      align-content: center;
    }
  }

  .surface-note {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.6;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
}
</style>

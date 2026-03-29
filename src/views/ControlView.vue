<template>
  <div class="control-layout">
    <header class="control-pagebar">
      <h1 class="control-pagebar-title">Futa E</h1>
      <Button
        label="開始"
        icon="pi pi-play"
        size="small"
        severity="success"
        :disabled="!isConfigReady"
        @click="startPlayer"
      />
    </header>

    <div v-if="isConfigReady" class="settings-window">
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
import DisplaySettingsPanel from '../components/control/DisplaySettingsPanel.vue'
import PlaylistWorkbenchSection from '../components/control/PlaylistWorkbenchSection.vue'
import { useControlView } from '../composables/useControlView'

const {
  addPlaylist,
  config,
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
  gap: 16px;
  width: min(1360px, 100%);
  animation: rise 420ms ease-out;

  .control-pagebar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    height: 48px;
    padding: 0 4px;
    border-bottom: 1px solid var(--line-subtle);

    &-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
  }

  .settings-window {
    display: grid;
    gap: 16px;
  }

  .settings-main {
    min-width: 0;
    display: grid;
    gap: 16px;
    width: min(1120px, 100%);
    margin-inline: auto;
  }

  .control-surface {
    display: grid;
    gap: 18px;
    padding: 18px 22px;
    border-radius: 22px;
    background: var(--panel);
    border: 1px solid var(--line-subtle);
    box-shadow: var(--shadow);

    &-loading {
      justify-items: start;
    }
  }

  .surface-note {
    font-size: 12.5px;
    color: var(--muted);
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
}
</style>

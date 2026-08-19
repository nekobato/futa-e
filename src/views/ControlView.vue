<template>
  <div class="control-layout">
    <a class="skip-link" href="#main-content">主要設定へ移動</a>

    <header class="control-pagebar">
      <div class="control-pagebar-brand">
        <img
          class="control-pagebar-logo"
          src="/futa-e-logo.png"
          alt=""
          aria-hidden="true"
          width="56"
          height="56"
        />
        <h1 class="control-pagebar-title">Futa E</h1>
      </div>
      <div class="control-pagebar-actions">
        <ElButton
          class="control-pagebar-button"
          :icon="VideoPlay"
          size="small"
          type="primary"
          :disabled="!isConfigReady"
          @click="handleStartPlayer"
        >
          開始
        </ElButton>
        <ElButton
          class="control-pagebar-button"
          :icon="QuestionFilled"
          size="small"
          type="info"
          plain
          @click="showTutorial"
        >
          使い方
        </ElButton>
      </div>
    </header>

    <main
      v-if="isTutorialVisible"
      id="main-content"
      class="tutorial-main"
      tabindex="-1"
    >
      <section
        class="control-surface tutorial-surface"
        aria-labelledby="usage-title"
      >
        <div class="tutorial-header">
          <div class="tutorial-heading-copy">
            <p class="surface-kicker">Guide</p>
            <h2 id="usage-title">使い方</h2>
          </div>
          <ElButton
            :icon="ArrowLeft"
            size="small"
            type="info"
            plain
            @click="hideTutorial"
          >
            設定へ戻る
          </ElButton>
        </div>

        <ol class="tutorial-steps">
          <li>
            <span class="tutorial-step-index">1</span>
            <div class="tutorial-step-copy">
              <strong>Displayを選ぶ</strong>
              <p>再生に使うDisplayを有効にします。</p>
            </div>
          </li>
          <li>
            <span class="tutorial-step-index">2</span>
            <div class="tutorial-step-copy">
              <strong>Playlistを整える</strong>
              <p>
                画像・動画・Webを追加し、表示時間や固定順・Shuffleを調整します。
              </p>
            </div>
          </li>
          <li>
            <span class="tutorial-step-index">3</span>
            <div class="tutorial-step-copy">
              <strong>Displayごとの内容を決める</strong>
              <p>
                「Display別」にすると、接続中の画面を並べて内容を編集できます。
              </p>
            </div>
          </li>
          <li>
            <span class="tutorial-step-index">4</span>
            <div class="tutorial-step-copy">
              <strong>開始する</strong>
              <p>
                「開始」でKiosk再生を始めます。終了は
                <code translate="no">{{
                  kioskExitShortcutSettings.accelerator
                }}</code>
                です。
              </p>
            </div>
          </li>
        </ol>
      </section>
    </main>

    <main
      v-else-if="isConfigReady"
      id="main-content"
      class="settings-main"
      tabindex="-1"
    >
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
        @add-playlist="addPlaylist"
        @duplicate-selected-playlist="duplicateSelectedPlaylist"
        @move-selected-playlist="moveSelectedPlaylist"
        @remove-selected-playlist="removeSelectedPlaylist"
        @rename-selected-playlist="renameSelectedPlaylist"
        @select-playlist="selectPlaylist"
        @set-active-playlist="setActivePlaylist"
        @set-display-playlist-enabled="setSelectedDisplayPlaylistEnabled"
        @toggle-selected-playlist-per-display="toggleSelectedPlaylistPerDisplay"
        @update-selected-display-playlist="updateSelectedDisplayPlaylist"
        @update-selected-playlist-default-duration="
          updateSelectedPlaylistDefaultDuration
        "
        @update-selected-playlist-settings="updateSelectedPlaylistSettings"
        @update-selected-playlist-web-timeout="updateSelectedPlaylistWebTimeout"
        @update-selected-shared-playlist="updateSelectedSharedPlaylist"
      />

      <StartupSettingsPanel
        :settings="launchAtLoginSettings"
        :pending="launchAtLoginPending"
        :error-message="launchAtLoginError"
        @update="setLaunchAtLogin"
      />

      <KioskShortcutSettingsPanel
        :settings="kioskExitShortcutSettings"
        :pending="kioskExitShortcutPending"
        :error-message="kioskExitShortcutError"
        @update="setKioskExitShortcut"
      />
    </main>

    <div v-else class="control-surface control-surface-loading">
      <p class="surface-note">設定を読み込んでおります。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ArrowLeft, QuestionFilled, VideoPlay } from '@element-plus/icons-vue'
import DisplaySettingsPanel from '../components/control/DisplaySettingsPanel.vue'
import KioskShortcutSettingsPanel from '../components/control/KioskShortcutSettingsPanel.vue'
import PlaylistWorkbenchSection from '../components/control/PlaylistWorkbenchSection.vue'
import StartupSettingsPanel from '../components/control/StartupSettingsPanel.vue'
import { useControlView } from '../composables/useControlView'
import { notifications } from '../shared/notifications'

const {
  addPlaylist,
  config,
  enabledDisplayCount,
  displayInfos,
  duplicateSelectedPlaylist,
  isConfigReady,
  kioskExitShortcutError,
  kioskExitShortcutPending,
  kioskExitShortcutSettings,
  launchAtLoginError,
  launchAtLoginPending,
  launchAtLoginSettings,
  moveSelectedPlaylist,
  removeSelectedPlaylist,
  renameSelectedPlaylist,
  selectPlaylist,
  selectedPlaylist,
  selectedPlaylistIndex,
  setActivePlaylist,
  setDisplayEnabled,
  setLaunchAtLogin,
  setKioskExitShortcut,
  setSelectedDisplayPlaylistEnabled,
  startPlayer,
  toggleSelectedPlaylistPerDisplay,
  updateSelectedDisplayPlaylist,
  updateSelectedPlaylistDefaultDuration,
  updateSelectedPlaylistSettings,
  updateSelectedPlaylistWebTimeout,
  updateSelectedSharedPlaylist
} = useControlView()

const isTutorialVisible = ref(false)

/** Shows the lightweight usage tutorial in place of the settings screen. */
const showTutorial = () => {
  isTutorialVisible.value = true
}

/** Restores the editable settings screen from the usage tutorial. */
const hideTutorial = () => {
  isTutorialVisible.value = false
}

/** Prevents player launch when every display has been disabled in settings. */
const handleStartPlayer = async () => {
  if (enabledDisplayCount.value === 0) {
    notifications.warning('少なくとも一つのDisplayを有効にしてください', {
      title: '開始できません'
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

  .skip-link {
    position: fixed;
    inset-block-start: 12px;
    inset-inline-start: 12px;
    z-index: 1000;
    padding: 9px 13px;
    border: 2px solid var(--focus-line);
    border-radius: 9px;
    background: var(--surface-strong);
    color: var(--ink);
    font-weight: 700;
    text-decoration: none;
    transform: translateY(-160%);

    &:focus-visible {
      outline: 3px solid var(--focus-ring);
      outline-offset: 2px;
      transform: translateY(0);
    }
  }

  .control-pagebar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    padding: 0 10px;

    .control-pagebar-brand {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .control-pagebar-logo {
      width: 56px;
      height: 56px;
      flex: 0 0 56px;
      display: block;
    }

    &-title {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(34px, 4vw, 52px);
      line-height: 0.92;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
  }

  .control-pagebar-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }

  .control-pagebar-button {
    width: 112px;
    justify-content: center;
  }

  .settings-main {
    min-width: 0;
    display: grid;
    gap: 24px;
  }

  .tutorial-main {
    min-width: 0;
    display: grid;
  }

  :where(.settings-main, .tutorial-main):focus-visible {
    outline: 2px solid var(--focus-line);
    outline-offset: 8px;
    box-shadow: 0 0 0 4px var(--focus-ring);
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

  .tutorial-surface {
    min-height: 320px;
    align-content: start;
  }

  .tutorial-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
  }

  .tutorial-heading-copy {
    display: grid;
    gap: 6px;

    h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 28px;
      line-height: 1;
      letter-spacing: 0.01em;
    }
  }

  .surface-kicker {
    margin: 0;
    font-family: var(--font-display);
    font-size: 11px;
    line-height: 1;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .tutorial-steps {
    display: grid;
    gap: 14px;
    margin: 8px 0 0;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr);
      align-items: start;
      gap: 14px;
      padding: 16px 0;
      border-top: 1px solid var(--line-subtle);
    }
  }

  .tutorial-step-index {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-strong), var(--paper-2) 42%);
    border: 1px solid var(--line-subtle);
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 700;
    color: color-mix(in srgb, var(--ink), var(--accent) 26%);
  }

  .tutorial-step-copy {
    display: grid;
    gap: 4px;
    min-width: 0;

    strong {
      font-size: 15px;
      line-height: 1.35;
    }

    p {
      margin: 0;
      font-size: 13px;
      line-height: 1.65;
      color: var(--muted);
      overflow-wrap: anywhere;
    }

    code {
      font-family:
        ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.92em;
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

@media (prefers-reduced-motion: reduce) {
  .control-layout {
    animation: none;
  }
}
</style>

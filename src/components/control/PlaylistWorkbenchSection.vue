<template>
  <section class="playlist-section">
    <div class="section-heading">
      <h2>Playlists</h2>
    </div>

    <div class="playlist-workbench">
      <aside class="playlist-pane">
        <div class="playlist-pane-card">
          <div class="playlist-pane-header">
            <h3>一覧</h3>

            <div class="row playlist-pane-actions">
              <ElButton
                :icon="Plus"
                size="small"
                text
                type="info"
                aria-label="プレイリストを追加"
                data-testid="playlist-add-button"
                @click="emit('add-playlist')"
              />
              <ElButton
                :icon="CopyDocument"
                size="small"
                text
                type="info"
                aria-label="プレイリストを複製"
                @click="emit('duplicate-selected-playlist')"
              />
              <ElButton
                :icon="Delete"
                size="small"
                type="danger"
                text
                aria-label="プレイリストを削除"
                :disabled="!canRemoveSelectedPlaylist"
                @click="emit('remove-selected-playlist')"
              />
            </div>
          </div>

          <div class="playlist-catalog" data-testid="playlist-list">
            <button
              v-for="playlist in config.playlists"
              :key="playlist.id"
              type="button"
              class="playlist-summary"
              :class="{ 'is-selected': playlist.id === selectedPlaylist.id }"
              data-testid="playlist-list-item"
              @click="emit('select-playlist', playlist.id)"
            >
              <div class="playlist-summary-copy">
                <strong>{{ playlist.name }}</strong>
                <span class="surface-note"
                  >項目 {{ playlist.items.length }} 件</span
                >
              </div>

              <div class="playlist-summary-meta">
                <ElTag
                  v-if="playlist.id === config.activePlaylistId"
                  type="success"
                >
                  使用中
                </ElTag>
                <ElTag v-if="playlist.perDisplay" type="info"> 個別設定 </ElTag>
              </div>
            </button>
          </div>
        </div>
      </aside>

      <section class="playlist-detail">
        <div class="playlist-detail-card">
          <div class="playlist-detail-bar">
            <div class="playlist-detail-actions">
              <ElTag v-if="isSelectedPlaylistActive" type="success">
                現在の再生対象
              </ElTag>
              <ElButton
                v-else
                :icon="Check"
                size="small"
                type="info"
                plain
                :disabled="!canSetSelectedPlaylistActive"
                @click="emit('set-active-playlist', selectedPlaylist.id)"
              >
                再生対象にする
              </ElButton>
              <ElButton
                :icon="ArrowUp"
                size="small"
                text
                type="info"
                aria-label="プレイリストを上へ移動"
                :disabled="!canMoveSelectedPlaylistUp"
                @click="emit('move-selected-playlist', -1)"
              />
              <ElButton
                :icon="ArrowDown"
                size="small"
                text
                type="info"
                aria-label="プレイリストを下へ移動"
                :disabled="!canMoveSelectedPlaylistDown"
                @click="emit('move-selected-playlist', 1)"
              />
            </div>
          </div>

          <div class="playlist-detail-body">
            <div class="playlist-settings">
              <div class="playlist-setting-row">
                <label :for="playlistNameInputId" class="playlist-setting-label"
                  >プレイリスト名</label
                >
                <div class="playlist-setting-control">
                  <ElInput
                    :id="playlistNameInputId"
                    :model-value="playlistNameDraft"
                    size="small"
                    class="w-full"
                    @focus="focusDraftInput('playlistName')"
                    @update:model-value="updatePlaylistNameDraft"
                    @blur="commitPlaylistNameDraft"
                  />
                </div>
              </div>

              <div
                class="playlist-setting-row"
                data-testid="per-display-controls"
              >
                <label :for="perDisplayInputId" class="playlist-setting-label"
                  >モニターを分ける</label
                >
                <div
                  class="playlist-setting-control playlist-setting-control-toggle"
                >
                  <ElSwitch
                    :id="perDisplayInputId"
                    :model-value="selectedPlaylist.perDisplay"
                    @update:model-value="
                      emit(
                        'toggle-selected-playlist-per-display',
                        $event === true
                      )
                    "
                  />
                </div>
              </div>

              <div class="playlist-setting-row">
                <label :for="playlistLoopInputId" class="playlist-setting-label"
                  >ループ再生</label
                >
                <div
                  class="playlist-setting-control playlist-setting-control-toggle"
                >
                  <ElSwitch
                    :id="playlistLoopInputId"
                    :model-value="selectedPlaylist.loop"
                    @update:model-value="
                      emit('update-selected-playlist-settings', {
                        loop: $event === true
                      })
                    "
                  />
                </div>
              </div>

              <div class="playlist-setting-row">
                <label
                  :for="playlistShuffleInputId"
                  class="playlist-setting-label"
                  >シャッフル</label
                >
                <div
                  class="playlist-setting-control playlist-setting-control-toggle"
                >
                  <ElSwitch
                    :id="playlistShuffleInputId"
                    :model-value="selectedPlaylist.shuffle"
                    @update:model-value="
                      emit('update-selected-playlist-settings', {
                        shuffle: $event === true
                      })
                    "
                  />
                </div>
              </div>

              <div class="playlist-setting-row">
                <label
                  :for="playlistDefaultDurationInputId"
                  class="playlist-setting-label"
                  >表示時間（秒）</label
                >
                <div class="playlist-setting-control">
                  <ElInputNumber
                    :id="playlistDefaultDurationInputId"
                    :model-value="playlistDefaultDurationDraft"
                    size="small"
                    class="w-full"
                    :min="PLAYLIST_DURATION_MIN"
                    :max="PLAYLIST_DURATION_MAX"
                    @focus="focusDraftInput('defaultDuration')"
                    @update:model-value="updatePlaylistDefaultDurationDraft"
                    @blur="commitPlaylistDefaultDurationDraft"
                  />
                </div>
              </div>

              <div class="playlist-setting-row">
                <label
                  :for="playlistWebTimeoutInputId"
                  class="playlist-setting-label"
                  >読込待機時間（秒）</label
                >
                <div class="playlist-setting-control">
                  <ElInputNumber
                    :id="playlistWebTimeoutInputId"
                    :model-value="playlistWebTimeoutDraft"
                    size="small"
                    class="w-full"
                    :min="PLAYLIST_WEB_TIMEOUT_MIN"
                    :max="PLAYLIST_WEB_TIMEOUT_MAX"
                    @focus="focusDraftInput('webTimeout')"
                    @update:model-value="updatePlaylistWebTimeoutDraft"
                    @blur="commitPlaylistWebTimeoutDraft"
                  />
                </div>
              </div>
            </div>

            <div v-if="selectedPlaylist.perDisplay" class="playlist-tab-shell">
              <ElTabs
                class="playlist-tabs"
                :model-value="selectedPlaylistScope"
                @update:model-value="
                  emit('update-selected-playlist-scope', $event)
                "
              >
                <ElTabPane :label="primaryDisplayTabLabel" name="shared">
                  <div class="playlist-editor-shell">
                    <PlaylistEditor
                      :playlist="selectedPlaylist.items"
                      :default-duration-sec="
                        selectedPlaylist.defaultDurationSec
                      "
                      @update:playlist="
                        emit('update-selected-shared-playlist', $event)
                      "
                    />
                  </div>
                </ElTabPane>

                <ElTabPane
                  v-for="display in secondaryDisplays"
                  :key="display.id"
                  :label="display.label"
                  :name="display.id"
                >
                  <div
                    class="playlist-editor-shell"
                    :data-testid="`display-card-${display.id}`"
                  >
                    <div class="field-inline display-editor-header">
                      <div class="field-copy">
                        <strong>{{ display.label }}</strong>
                        <p class="surface-note">
                          {{ display.bounds.width }} x
                          {{ display.bounds.height }}
                        </p>
                      </div>

                      <div class="display-summary-actions">
                        <ElTag type="info">
                          {{ display.isPrimary ? 'メイン' : '画面' }}
                        </ElTag>
                        <div class="field-inline field-inline-compact">
                          <label
                            :for="displayPlaylistEnabledInputId(display.id)"
                            >再生対象</label
                          >
                          <ElSwitch
                            :id="displayPlaylistEnabledInputId(display.id)"
                            :model-value="
                              isDisplayEnabledForPlaylist(display.id)
                            "
                            @update:model-value="
                              emit(
                                'set-display-playlist-enabled',
                                display.id,
                                $event === true
                              )
                            "
                          />
                        </div>
                      </div>
                    </div>

                    <PlaylistEditor
                      :playlist="displayPlaylist(display.id).items"
                      :default-duration-sec="
                        displayPlaylist(display.id).defaultDurationSec
                      "
                      @update:playlist="
                        emit(
                          'update-selected-display-playlist',
                          display.id,
                          $event
                        )
                      "
                    />
                  </div>
                </ElTabPane>
              </ElTabs>
            </div>

            <div v-else class="playlist-editor-shell">
              <PlaylistEditor
                :playlist="selectedPlaylist.items"
                :default-duration-sec="selectedPlaylist.defaultDurationSec"
                @update:playlist="
                  emit('update-selected-shared-playlist', $event)
                "
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  Check,
  CopyDocument,
  Delete,
  Plus
} from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'
import PlaylistEditor from '../PlaylistEditor.vue'
import {
  createDefaultPlaylistName,
  DEFAULT_PLAYLIST_DURATION_SEC,
  DEFAULT_PLAYLIST_WEB_TIMEOUT_SEC
} from '../../shared/defaults'
import { getPlaylistById, getPrimaryDisplay } from '../../shared/player-config'
import type {
  DisplayInfo,
  PlayerConfig,
  PlaylistConfig,
  PlaylistItem
} from '../../shared/types'
import { clampNumber } from '../../shared/utils'

type PlaylistSettingsPatch = Partial<
  Pick<
    PlaylistConfig,
    'loop' | 'shuffle' | 'defaultDurationSec' | 'webTimeoutSec'
  >
>

const props = defineProps<{
  config: PlayerConfig
  displayInfos: DisplayInfo[]
  selectedPlaylist: PlaylistConfig
  selectedPlaylistIndex: number
  selectedPlaylistScope: string
}>()

const emit = defineEmits<{
  'add-playlist': []
  'duplicate-selected-playlist': []
  'move-selected-playlist': [offset: -1 | 1]
  'remove-selected-playlist': []
  'rename-selected-playlist': [name: string]
  'select-playlist': [playlistId: string]
  'set-active-playlist': [playlistId: string]
  'set-display-playlist-enabled': [displayId: string, enabled: boolean]
  'toggle-selected-playlist-per-display': [enabled: boolean]
  'update-selected-display-playlist': [
    displayId: string,
    playlist: PlaylistItem[]
  ]
  'update-selected-playlist-default-duration': [
    value: number | null | undefined
  ]
  'update-selected-playlist-scope': [value: string | number | null | undefined]
  'update-selected-playlist-settings': [settings: PlaylistSettingsPatch]
  'update-selected-playlist-web-timeout': [value: number | null | undefined]
  'update-selected-shared-playlist': [playlist: PlaylistItem[]]
}>()

const playlistNameInputId = 'control-playlist-name'
const perDisplayInputId = 'control-playlist-per-display'
const playlistLoopInputId = 'control-playlist-loop'
const playlistShuffleInputId = 'control-playlist-shuffle'
const playlistDefaultDurationInputId = 'control-playlist-default-duration'
const playlistWebTimeoutInputId = 'control-playlist-web-timeout'
const PLAYLIST_DURATION_MIN = 2
const PLAYLIST_DURATION_MAX = 36000
const PLAYLIST_WEB_TIMEOUT_MIN = 2
const PLAYLIST_WEB_TIMEOUT_MAX = 120

type NumericInputValue = number | null | undefined
type DraftInputName = 'playlistName' | 'defaultDuration' | 'webTimeout'

const focusedDraftInput = ref<DraftInputName | null>(null)
const playlistNameDraft = ref(props.selectedPlaylist.name)
const playlistDefaultDurationDraft = ref<NumericInputValue>(
  props.selectedPlaylist.defaultDurationSec
)
const playlistWebTimeoutDraft = ref<NumericInputValue>(
  props.selectedPlaylist.webTimeoutSec
)

const isSelectedPlaylistActive = computed(
  () => props.selectedPlaylist.id === props.config.activePlaylistId
)
const hasSelectedPlaylistItems = computed(() => {
  if (props.selectedPlaylist.items.length > 0) {
    return true
  }

  if (!props.selectedPlaylist.perDisplay) {
    return false
  }

  return Object.values(props.config.displays).some(
    (displayConfig) =>
      getPlaylistById(displayConfig.playlists, props.selectedPlaylist.id).items
        .length > 0
  )
})
const canSetSelectedPlaylistActive = computed(
  () => hasSelectedPlaylistItems.value
)
const canRemoveSelectedPlaylist = computed(
  () => props.config.playlists.length > 1
)
const canMoveSelectedPlaylistUp = computed(
  () => props.selectedPlaylistIndex > 0
)
const canMoveSelectedPlaylistDown = computed(
  () => props.selectedPlaylistIndex < props.config.playlists.length - 1
)
const primaryDisplay = computed(() => getPrimaryDisplay(props.displayInfos))
const primaryDisplayTabLabel = computed(
  () => primaryDisplay.value?.label ?? '共通'
)
const secondaryDisplays = computed(() =>
  props.displayInfos.filter(
    (display) => display.id !== primaryDisplay.value?.id
  )
)

watch(
  () =>
    [
      props.selectedPlaylist.id,
      props.selectedPlaylist.name,
      props.selectedPlaylist.defaultDurationSec,
      props.selectedPlaylist.webTimeoutSec
    ] as const,
  ([, name, defaultDurationSec, webTimeoutSec]) => {
    if (focusedDraftInput.value !== 'playlistName') {
      playlistNameDraft.value = name
    }

    if (focusedDraftInput.value !== 'defaultDuration') {
      playlistDefaultDurationDraft.value = defaultDurationSec
    }

    if (focusedDraftInput.value !== 'webTimeout') {
      playlistWebTimeoutDraft.value = webTimeoutSec
    }
  }
)

/** Marks an input draft as actively edited so external saves cannot overwrite it. */
const focusDraftInput = (inputName: DraftInputName) => {
  focusedDraftInput.value = inputName
}

/** Clears the active draft marker after the matching input has committed. */
const clearFocusedDraftInput = (inputName: DraftInputName) => {
  if (focusedDraftInput.value === inputName) {
    focusedDraftInput.value = null
  }
}

/** Checks whether an input draft carries a usable finite number. */
const isFiniteNumberDraft = (value: NumericInputValue): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/** Resolves a numeric draft to its defaulted and clamped committed value. */
const resolveNumericDraft = (
  value: NumericInputValue,
  fallback: number,
  min: number,
  max: number
): number =>
  clampNumber(isFiniteNumberDraft(value) ? value : fallback, min, max)

/** Updates the playlist name draft without committing blank text. */
const updatePlaylistNameDraft = (value: string | undefined) => {
  const name = value ?? ''
  playlistNameDraft.value = name

  if (name.trim().length > 0) {
    emit('rename-selected-playlist', name)
  }
}

/** Commits the playlist name, defaulting only after the input loses focus. */
const commitPlaylistNameDraft = () => {
  const name = playlistNameDraft.value
  const committedName =
    name.trim().length > 0
      ? name
      : createDefaultPlaylistName(props.selectedPlaylistIndex)

  playlistNameDraft.value = committedName
  clearFocusedDraftInput('playlistName')

  if (committedName !== props.selectedPlaylist.name) {
    emit('rename-selected-playlist', committedName)
  }
}

/** Updates the default duration draft while preserving the empty input state. */
const updatePlaylistDefaultDurationDraft = (value: NumericInputValue) => {
  playlistDefaultDurationDraft.value = value

  if (isFiniteNumberDraft(value)) {
    emit('update-selected-playlist-default-duration', value)
  }
}

/** Commits the default duration, filling blank input with the configured default. */
const commitPlaylistDefaultDurationDraft = () => {
  const value = resolveNumericDraft(
    playlistDefaultDurationDraft.value,
    DEFAULT_PLAYLIST_DURATION_SEC,
    PLAYLIST_DURATION_MIN,
    PLAYLIST_DURATION_MAX
  )

  playlistDefaultDurationDraft.value = value
  clearFocusedDraftInput('defaultDuration')

  if (value !== props.selectedPlaylist.defaultDurationSec) {
    emit('update-selected-playlist-default-duration', value)
  }
}

/** Updates the web timeout draft while preserving the empty input state. */
const updatePlaylistWebTimeoutDraft = (value: NumericInputValue) => {
  playlistWebTimeoutDraft.value = value

  if (isFiniteNumberDraft(value)) {
    emit('update-selected-playlist-web-timeout', value)
  }
}

/** Commits the web timeout, filling blank input with the configured default. */
const commitPlaylistWebTimeoutDraft = () => {
  const value = resolveNumericDraft(
    playlistWebTimeoutDraft.value,
    DEFAULT_PLAYLIST_WEB_TIMEOUT_SEC,
    PLAYLIST_WEB_TIMEOUT_MIN,
    PLAYLIST_WEB_TIMEOUT_MAX
  )

  playlistWebTimeoutDraft.value = value
  clearFocusedDraftInput('webTimeout')

  if (value !== props.selectedPlaylist.webTimeoutSec) {
    emit('update-selected-playlist-web-timeout', value)
  }
}

/** Builds a stable input id for per-playlist display inclusion toggles. */
const displayPlaylistEnabledInputId = (displayId: string) =>
  `display-playlist-enabled-${displayId}`

/** Resolves whether the selected playlist includes a display in playback. */
const isDisplayEnabledForPlaylist = (displayId: string) =>
  props.config.displays[displayId]?.playlistEnabled?.[
    props.selectedPlaylist.id
  ] !== false

/** Returns the playlist shown for a specific display tab. */
const displayPlaylist = (displayId: string) =>
  getPlaylistById(
    props.config.displays[displayId]?.playlists,
    props.selectedPlaylist.id
  )
</script>

<style lang="scss">
.playlist-section {
  display: grid;
  gap: 0;

  .surface-note {
    font-size: 12.5px;
    color: var(--muted);
    line-height: 1.6;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .row,
  .display-summary-actions,
  .playlist-detail-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .section-heading {
    width: 100%;
    display: flex;
    justify-content: flex-start;
    padding-left: 16px;

    h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 16px;
      line-height: 1;
      font-weight: 700;
      letter-spacing: 0.01em;
      text-wrap: balance;
      color: var(--ink);
    }
  }

  .playlist-settings {
    display: grid;
    gap: 14px;
  }

  .playlist-setting-row {
    display: grid;
    grid-template-columns: minmax(120px, 156px) minmax(0, 1fr);
    align-items: center;
    gap: 12px 16px;
  }

  .playlist-setting-label {
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .playlist-setting-control {
    min-width: 0;
    width: 100%;
    max-width: 360px;
    justify-self: stretch;
  }

  .playlist-setting-control-toggle {
    width: auto;
  }

  .field-inline {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--line-strong);
    background: var(--surface-strong);

    label {
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    > :not(.field-copy) {
      flex: 0 0 auto;
    }
  }

  .field-inline-compact {
    gap: 8px;
    padding: 7px 10px;
    border-radius: 999px;
    background: var(--panel-soft-strong);
  }

  .field-inline-toggle {
    align-items: flex-start;
  }

  .field-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
    flex: 1 1 240px;

    strong {
      font-weight: 600;
      letter-spacing: 0.01em;
    }
  }

  .w-full {
    width: 100%;
  }

  .playlist-workbench {
    display: grid;
    grid-template-columns: minmax(240px, 280px) minmax(0, 1fr);
    gap: 16px;
    min-height: clamp(560px, 62vh, 760px);
  }

  .playlist-pane,
  .playlist-detail {
    min-width: 0;
    display: grid;
    gap: 0;
    align-content: start;
  }

  .playlist-pane-card,
  .playlist-detail-card {
    min-width: 0;
    min-height: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 18px;
    border-radius: var(--radius-card);
    border: 1px solid var(--line-strong);
    background: color-mix(in srgb, var(--surface-strong), var(--panel) 12%);
  }

  .playlist-pane-header,
  .playlist-detail-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 16px;
  }

  .playlist-pane-header {
    h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--ink);
    }
  }

  .playlist-pane-actions {
    justify-content: flex-end;
  }

  :where(.playlist-pane-actions, .playlist-detail-actions) > .el-button {
    margin-left: 0;
  }

  .playlist-catalog {
    display: grid;
    gap: 8px;
    overflow: auto;
    padding-right: 4px;
  }

  .playlist-summary {
    appearance: none;
    border: 1px solid var(--line-strong);
    background: color-mix(in srgb, var(--surface-strong), var(--panel) 20%);
    border-radius: 12px;
    padding: 12px 13px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    text-align: left;
    color: inherit;
    cursor: pointer;
    transition:
      border-color 120ms ease,
      background 120ms ease,
      transform 120ms ease;

    &:hover {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--accent), transparent 54%);
    }

    &.is-selected {
      border-color: color-mix(in srgb, var(--accent), transparent 28%);
      background: color-mix(
        in srgb,
        var(--accent-soft),
        var(--surface-strong) 56%
      );
      box-shadow: inset 0 0 0 1px
        color-mix(in srgb, var(--accent), transparent 78%);
    }
  }

  .playlist-summary-copy,
  .playlist-summary-meta {
    display: grid;
    gap: 6px;
  }

  .playlist-summary-copy {
    strong {
      font-size: 15px;
      text-wrap: balance;
    }
  }

  .playlist-summary-meta {
    justify-items: end;
  }

  .playlist-detail-bar {
    justify-content: flex-end;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line-subtle);
  }

  .playlist-detail-actions {
    justify-content: flex-end;
    gap: 10px;
  }

  .playlist-detail-body {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    gap: 16px;
  }

  .playlist-tab-shell,
  .playlist-editor-shell {
    flex: 1;
    min-height: 0;
  }

  .playlist-editor-shell {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 4px 0 0;
  }

  .playlist-tab-shell {
    .playlist-tabs {
      --el-tabs-header-height: 40px;

      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    .playlist-tabs > :where(.el-tabs__header) {
      flex: 0 0 auto;
      margin: 0;
      --el-color-primary: var(--accent);
    }

    .playlist-tabs :where(.el-tabs__nav-wrap)::after {
      height: 1px;
      background-color: var(--line-subtle);
    }

    .playlist-tabs :where(.el-tabs__nav) {
      gap: 6px;
    }

    .playlist-tabs :where(.el-tabs__item) {
      padding-inline: 14px;
      color: var(--muted);
      border-radius: 999px 999px 0 0;
    }

    .playlist-tabs :where(.el-tabs__item.is-active) {
      color: var(--ink);
    }

    .playlist-tabs > :where(.el-tabs__content) {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 0;
    }

    .playlist-tabs :where(.el-tab-pane) {
      padding: 0;
    }
  }

  .display-editor-header {
    align-items: flex-start;
  }
}

@media (max-width: 900px) {
  .playlist-section {
    .playlist-workbench {
      grid-template-columns: minmax(220px, 248px) minmax(0, 1fr);
      gap: 14px;
    }

    .playlist-pane-card,
    .playlist-detail-card {
      padding: 16px;
    }

    .playlist-setting-row {
      grid-template-columns: minmax(104px, 132px) minmax(0, 1fr);
      gap: 10px 12px;
    }
  }
}

@media (max-width: 720px) {
  .playlist-section {
    .playlist-workbench {
      grid-template-columns: 1fr;
    }

    .playlist-setting-row {
      grid-template-columns: 1fr;
      align-items: start;
    }

    .playlist-setting-control {
      max-width: none;
    }
  }
}
</style>

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
                @click="confirmRemoveSelectedPlaylist"
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
            <section class="shared-settings" aria-labelledby="shared-title">
              <div class="settings-intro">
                <p class="surface-kicker">Playlist</p>
                <div class="settings-title-row">
                  <h3 id="shared-title">共通設定</h3>
                  <span class="shared-note"
                    >動作設定はすべてのDisplayで共通</span
                  >
                </div>
              </div>

              <div class="settings-grid">
                <div class="setting-block is-name">
                  <label :for="playlistNameInputId">プレイリスト名</label>
                  <ElInput
                    :id="playlistNameInputId"
                    :model-value="playlistNameDraft"
                    name="playlist-name"
                    autocomplete="off"
                    size="small"
                    @focus="focusDraftInput('playlistName')"
                    @update:model-value="updatePlaylistNameDraft"
                    @blur="commitPlaylistNameDraft"
                  />
                </div>

                <div class="setting-block is-toggle">
                  <label :for="playlistLoopInputId">Loop</label>
                  <ElSwitch
                    :id="playlistLoopInputId"
                    :model-value="selectedPlaylist.loop"
                    inline-prompt
                    active-text="ON"
                    inactive-text="OFF"
                    @update:model-value="
                      emit('update-selected-playlist-settings', {
                        loop: $event === true
                      })
                    "
                  />
                </div>

                <div class="setting-block is-toggle">
                  <label :for="playlistShuffleInputId">Shuffle</label>
                  <ElSwitch
                    :id="playlistShuffleInputId"
                    :model-value="selectedPlaylist.shuffle"
                    inline-prompt
                    active-text="ON"
                    inactive-text="OFF"
                    @update:model-value="
                      emit('update-selected-playlist-settings', {
                        shuffle: $event === true
                      })
                    "
                  />
                </div>

                <div class="setting-block is-number">
                  <label :for="playlistDefaultDurationInputId">既定秒</label>
                  <ElInputNumber
                    :id="playlistDefaultDurationInputId"
                    :model-value="playlistDefaultDurationDraft"
                    size="small"
                    controls-position="right"
                    :min="PLAYLIST_DURATION_MIN"
                    :max="PLAYLIST_DURATION_MAX"
                    @focus="focusDraftInput('defaultDuration')"
                    @update:model-value="updatePlaylistDefaultDurationDraft"
                    @blur="commitPlaylistDefaultDurationDraft"
                  />
                </div>

                <div class="setting-block is-number">
                  <label :for="playlistWebTimeoutInputId">Web待機</label>
                  <ElInputNumber
                    :id="playlistWebTimeoutInputId"
                    :model-value="playlistWebTimeoutDraft"
                    size="small"
                    controls-position="right"
                    :min="PLAYLIST_WEB_TIMEOUT_MIN"
                    :max="PLAYLIST_WEB_TIMEOUT_MAX"
                    @focus="focusDraftInput('webTimeout')"
                    @update:model-value="updatePlaylistWebTimeoutDraft"
                    @blur="commitPlaylistWebTimeoutDraft"
                  />
                </div>

                <div
                  class="setting-block is-mode"
                  data-testid="per-display-controls"
                >
                  <span id="playlist-mode-label">表示内容</span>
                  <ElSegmented
                    :id="perDisplayInputId"
                    :model-value="playlistMode"
                    :options="playlistModeOptions"
                    aria-labelledby="playlist-mode-label"
                    size="small"
                    @update:model-value="updatePlaylistMode"
                  />
                </div>
              </div>
            </section>

            <section class="lane-workspace" aria-labelledby="lane-title">
              <header class="lane-heading">
                <div>
                  <p class="surface-kicker">Sequence</p>
                  <div class="lane-title-row">
                    <h3 id="lane-title">表示内容</h3>
                    <ElTag v-if="selectedPlaylist.shuffle" type="warning">
                      ランダム再生
                    </ElTag>
                  </div>
                </div>
                <p class="surface-note">
                  {{ sequenceGuidance }}
                </p>
              </header>

              <div
                v-if="selectedPlaylist.perDisplay && orderedDisplays.length > 0"
                class="display-lanes"
              >
                <article
                  v-for="display in orderedDisplays"
                  :key="display.id"
                  class="display-lane"
                  :class="{
                    'is-global-disabled': !isDisplayGloballyEnabled(display.id),
                    'is-playlist-disabled': !isDisplayEnabledForPlaylist(
                      display.id
                    )
                  }"
                  :data-testid="`display-card-${display.id}`"
                >
                  <header class="lane-info">
                    <span class="display-icon" aria-hidden="true">
                      <Monitor />
                    </span>
                    <div class="lane-copy">
                      <strong>{{ display.label }}</strong>
                      <span>
                        {{ display.bounds.width }} × {{ display.bounds.height }}
                      </span>
                    </div>
                    <div class="lane-status">
                      <ElTag v-if="display.isPrimary" type="info">メイン</ElTag>
                      <ElTag
                        v-if="!isDisplayGloballyEnabled(display.id)"
                        type="danger"
                      >
                        Display無効
                      </ElTag>
                    </div>
                    <div class="lane-toggle">
                      <label :for="displayPlaylistEnabledInputId(display.id)">
                        再生対象
                      </label>
                      <ElSwitch
                        :id="displayPlaylistEnabledInputId(display.id)"
                        :model-value="isDisplayEnabledForPlaylist(display.id)"
                        :disabled="!isDisplayGloballyEnabled(display.id)"
                        @update:model-value="
                          emit(
                            'set-display-playlist-enabled',
                            display.id,
                            $event === true
                          )
                        "
                      />
                    </div>
                  </header>

                  <div class="lane-track">
                    <PlaylistEditor
                      compact
                      :show-header="false"
                      :playlist="playlistForDisplay(display).items"
                      :shuffle="selectedPlaylist.shuffle"
                      :default-duration-sec="
                        selectedPlaylist.defaultDurationSec
                      "
                      :empty-message="`${display.label}には項目がありません。`"
                      @update:playlist="updateDisplayPlaylist(display, $event)"
                    />
                  </div>
                </article>
              </div>

              <div v-else-if="selectedPlaylist.perDisplay" class="no-displays">
                <strong>接続中のDisplayがありません</strong>
                <p class="surface-note">
                  Displayを接続すると、ここに編集レーンが追加されます。
                </p>
              </div>

              <article v-else class="display-lane is-shared">
                <header class="lane-info">
                  <span class="display-icon" aria-hidden="true">
                    <Monitor />
                  </span>
                  <div class="lane-copy">
                    <strong>すべてのDisplay</strong>
                    <span>同じ項目と順序で再生</span>
                  </div>
                  <ElTag type="success">共通</ElTag>
                </header>

                <div class="lane-track">
                  <PlaylistEditor
                    compact
                    :show-header="false"
                    :playlist="selectedPlaylist.items"
                    :shuffle="selectedPlaylist.shuffle"
                    :default-duration-sec="selectedPlaylist.defaultDurationSec"
                    @update:playlist="
                      emit('update-selected-shared-playlist', $event)
                    "
                  />
                </div>
              </article>
            </section>
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
  Monitor,
  Plus
} from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
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

type PlaylistMode = 'shared' | 'display'

const props = defineProps<{
  config: PlayerConfig
  displayInfos: DisplayInfo[]
  selectedPlaylist: PlaylistConfig
  selectedPlaylistIndex: number
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
const playlistModeOptions: Array<{ label: string; value: PlaylistMode }> = [
  { label: '共通', value: 'shared' },
  { label: 'Display別', value: 'display' }
]

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
const orderedDisplays = computed(() =>
  [...props.displayInfos].sort((left, right) =>
    left.isPrimary === right.isPrimary ? 0 : left.isPrimary ? -1 : 1
  )
)
const playlistMode = computed<PlaylistMode>(() =>
  props.selectedPlaylist.perDisplay ? 'display' : 'shared'
)
const sequenceGuidance = computed(() =>
  props.selectedPlaylist.shuffle
    ? 'Shuffle中です。この並びは管理順で、実際の再生順は毎回変わります。'
    : 'カードをドラッグするか、左右の矢印ボタンで再生順を変更できます。'
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

/** Resolves whether the global Display switch permits playback. */
const isDisplayGloballyEnabled = (displayId: string) =>
  props.config.displays[displayId]?.enabled !== false

/** Returns the playlist shown for a specific display tab. */
const displayPlaylist = (displayId: string) =>
  getPlaylistById(
    props.config.displays[displayId]?.playlists,
    props.selectedPlaylist.id
  )

/** Returns the primary shared items or a secondary Display override. */
const playlistForDisplay = (display: DisplayInfo) =>
  display.id === primaryDisplay.value?.id
    ? props.selectedPlaylist
    : displayPlaylist(display.id)

/** Routes lane edits to the shared primary list or a Display override. */
const updateDisplayPlaylist = (
  display: DisplayInfo,
  playlist: PlaylistItem[]
) => {
  if (display.id === primaryDisplay.value?.id) {
    emit('update-selected-shared-playlist', playlist)
    return
  }

  emit('update-selected-display-playlist', display.id, playlist)
}

/** Switches between one shared sequence and simultaneous Display lanes. */
const updatePlaylistMode = (value: string | number | null | undefined) => {
  emit('toggle-selected-playlist-per-display', value === 'display')
}

/** Protects autosaved playlist data from an accidental destructive click. */
const confirmRemoveSelectedPlaylist = async () => {
  if (!canRemoveSelectedPlaylist.value) {
    return
  }

  const activeMessage = isSelectedPlaylistActive.value
    ? '現在の再生対象は別のプレイリストへ切り替わります。'
    : ''

  try {
    await ElMessageBox.confirm(
      `「${props.selectedPlaylist.name}」に含まれるすべての表示内容を削除します。${activeMessage}この操作は元に戻せません。`,
      'プレイリストを削除',
      {
        confirmButtonText: '削除',
        cancelButtonText: 'キャンセル',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  emit('remove-selected-playlist')
}
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

  .surface-kicker {
    margin: 0;
    color: var(--muted);
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    line-height: 1;
    text-transform: uppercase;
  }

  .shared-settings {
    display: grid;
    gap: 14px;
    padding: 14px 16px 16px;
    border: 1px solid var(--line-strong);
    border-radius: 14px;
    background: color-mix(
      in srgb,
      var(--panel-soft),
      var(--surface-strong) 28%
    );
  }

  .settings-intro {
    display: grid;
    gap: 6px;
  }

  .settings-title-row {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px 12px;

    h3 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 17px;
      line-height: 1.1;
    }
  }

  .shared-note {
    color: var(--muted);
    font-size: 0.86rem;
  }

  .settings-grid {
    display: grid;
    grid-template-columns:
      minmax(180px, 1.45fr) minmax(88px, 0.55fr) minmax(96px, 0.62fr)
      minmax(112px, 0.72fr) minmax(112px, 0.72fr) minmax(190px, 1fr);
    gap: 10px;
  }

  .setting-block {
    min-width: 0;
    display: grid;
    align-content: center;
    gap: 6px;
    padding: 9px 10px;
    border: 1px solid var(--line-subtle);
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface-strong), transparent 10%);

    label,
    > span {
      color: var(--muted);
      font-size: 0.86rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    :where(.el-input-number, .el-input, .el-segmented) {
      width: 100%;
    }
  }

  .setting-block.is-toggle {
    grid-template-columns: 1fr auto;
    align-items: center;

    label {
      color: var(--ink);
      font-family: var(--font-display);
      font-size: 0.86rem;
    }
  }

  .setting-block.is-mode {
    --el-segmented-bg-color: var(--panel-soft-strong);
    --el-segmented-item-selected-bg-color: var(--accent);
    --el-segmented-item-selected-color: var(--surface-strong);
  }

  .playlist-workbench {
    display: grid;
    grid-template-columns: minmax(200px, 232px) minmax(0, 1fr);
    gap: 12px;
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

    &:focus-visible {
      outline: 2px solid var(--focus-line);
      outline-offset: 3px;
      box-shadow: 0 0 0 4px var(--focus-ring);
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

  .lane-workspace {
    min-width: 0;
    display: grid;
    gap: 12px;
    overflow: clip;
    border: 1px solid var(--line-strong);
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-strong), var(--panel) 8%);
  }

  .lane-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px 0;

    > div {
      flex: 0 0 auto;
      display: grid;
      gap: 5px;
    }

    h3 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 17px;
      line-height: 1.1;
      white-space: nowrap;
    }

    p {
      min-width: 0;
      max-width: 440px;
      margin: 0;
      text-align: end;
    }
  }

  .lane-title-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
  }

  .display-lanes {
    min-width: 0;
    display: grid;
  }

  .display-lane {
    min-width: 0;
    display: grid;
    grid-template-columns: 156px minmax(0, 1fr);
    border-top: 1px solid var(--line-subtle);
    transition: opacity 120ms ease;
  }

  .display-lane.is-shared {
    margin-top: 2px;
  }

  .display-lane.is-global-disabled,
  .display-lane.is-playlist-disabled {
    .lane-info,
    .lane-track {
      opacity: 0.52;
    }
  }

  .lane-info {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-content: start;
    gap: 8px 10px;
    padding: 16px 12px;
    border-inline-end: 1px solid var(--line-subtle);
    background: color-mix(in srgb, var(--panel-soft), transparent 18%);
  }

  .display-icon {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: var(--surface-strong);
    color: color-mix(in srgb, var(--accent), var(--ink) 18%);

    svg {
      width: 16px;
      height: 16px;
    }
  }

  .lane-copy {
    min-width: 0;
    display: grid;
    gap: 2px;

    strong {
      overflow: clip;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
    }

    span {
      color: var(--muted);
      font-size: 0.86rem;
      font-variant-numeric: tabular-nums;
    }
  }

  .lane-status {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .lane-toggle {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 2px;

    label {
      color: var(--muted);
      font-size: 0.86rem;
      font-weight: 700;
    }
  }

  .lane-track {
    min-width: 0;
    padding: 8px 10px 2px;
    background: color-mix(in srgb, var(--panel-soft), transparent 72%);
  }

  .no-displays {
    display: grid;
    justify-items: start;
    gap: 5px;
    margin-top: 2px;
    padding: 28px 16px;
    border-top: 1px solid var(--line-subtle);

    p {
      margin: 0;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .playlist-section {
    .playlist-summary,
    .display-lane {
      transition: none;
    }
  }
}

@media (max-width: 900px) {
  .playlist-section {
    .playlist-workbench {
      grid-template-columns: minmax(190px, 216px) minmax(0, 1fr);
      gap: 14px;
    }

    .playlist-pane-card,
    .playlist-detail-card {
      padding: 16px;
    }

    .settings-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .setting-block.is-name,
    .setting-block.is-mode {
      grid-column: span 2;
    }

    .lane-heading {
      align-items: start;
      flex-direction: column;
      gap: 6px;

      p {
        max-width: none;
        text-align: start;
      }
    }
  }
}

@media (max-width: 720px) {
  .playlist-section {
    .playlist-workbench {
      grid-template-columns: 1fr;
    }

    .settings-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .setting-block.is-name,
    .setting-block.is-mode {
      grid-column: 1 / -1;
    }

    .display-lane {
      grid-template-columns: 132px minmax(0, 1fr);
    }
  }
}
</style>

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
              <Button
                icon="pi pi-plus"
                size="small"
                text
                severity="secondary"
                aria-label="プレイリストを追加"
                data-testid="playlist-add-button"
                @click="emit('add-playlist')"
              />
              <Button
                icon="pi pi-copy"
                size="small"
                text
                severity="secondary"
                aria-label="プレイリストを複製"
                @click="emit('duplicate-selected-playlist')"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                severity="danger"
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
                <Tag
                  v-if="playlist.id === config.activePlaylistId"
                  value="使用中"
                  severity="success"
                />
                <Tag
                  v-if="playlist.perDisplay"
                  value="個別設定"
                  severity="secondary"
                />
              </div>
            </button>
          </div>
        </div>
      </aside>

      <section class="playlist-detail">
        <div class="playlist-detail-card">
          <div class="playlist-detail-bar">
            <div class="playlist-detail-actions">
              <Tag
                v-if="isSelectedPlaylistActive"
                value="現在の再生対象"
                severity="success"
              />
              <Button
                v-else
                label="再生対象にする"
                icon="pi pi-check"
                size="small"
                severity="secondary"
                :disabled="!canSetSelectedPlaylistActive"
                @click="emit('set-active-playlist', selectedPlaylist.id)"
              />
              <Button
                icon="pi pi-arrow-up"
                size="small"
                text
                severity="secondary"
                aria-label="プレイリストを上へ移動"
                :disabled="!canMoveSelectedPlaylistUp"
                @click="emit('move-selected-playlist', -1)"
              />
              <Button
                icon="pi pi-arrow-down"
                size="small"
                text
                severity="secondary"
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
                  <InputText
                    :id="playlistNameInputId"
                    :modelValue="selectedPlaylist.name"
                    size="small"
                    class="w-full"
                    @update:modelValue="
                      emit('rename-selected-playlist', String($event ?? ''))
                    "
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
                  <ToggleSwitch
                    :inputId="perDisplayInputId"
                    :modelValue="selectedPlaylist.perDisplay"
                    @update:modelValue="
                      emit(
                        'toggle-selected-playlist-per-display',
                        Boolean($event)
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
                  <ToggleSwitch
                    :inputId="playlistLoopInputId"
                    :modelValue="selectedPlaylist.loop"
                    @update:modelValue="
                      emit('update-selected-playlist-settings', {
                        loop: Boolean($event)
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
                  <ToggleSwitch
                    :inputId="playlistShuffleInputId"
                    :modelValue="selectedPlaylist.shuffle"
                    @update:modelValue="
                      emit('update-selected-playlist-settings', {
                        shuffle: Boolean($event)
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
                  <InputNumber
                    :inputId="playlistDefaultDurationInputId"
                    :modelValue="selectedPlaylist.defaultDurationSec"
                    size="small"
                    :min="2"
                    :max="36000"
                    @update:modelValue="
                      emit('update-selected-playlist-default-duration', $event)
                    "
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
                  <InputNumber
                    :inputId="playlistWebTimeoutInputId"
                    :modelValue="selectedPlaylist.webTimeoutSec"
                    size="small"
                    :min="2"
                    :max="120"
                    @update:modelValue="
                      emit('update-selected-playlist-web-timeout', $event)
                    "
                  />
                </div>
              </div>
            </div>

            <div v-if="selectedPlaylist.perDisplay" class="playlist-tab-shell">
              <Tabs
                :value="selectedPlaylistScope"
                @update:value="emit('update-selected-playlist-scope', $event)"
              >
                <TabList>
                  <Tab value="shared">{{ primaryDisplayTabLabel }}</Tab>
                  <Tab
                    v-for="display in secondaryDisplays"
                    :key="display.id"
                    :value="display.id"
                  >
                    {{ display.label }}
                  </Tab>
                </TabList>

                <TabPanels>
                  <TabPanel value="shared">
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
                  </TabPanel>

                  <TabPanel
                    v-for="display in secondaryDisplays"
                    :key="display.id"
                    :value="display.id"
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
                          <Tag
                            :value="display.isPrimary ? 'メイン' : '画面'"
                            severity="secondary"
                          />
                          <div class="field-inline field-inline-compact">
                            <label
                              :for="displayEditorEnabledInputId(display.id)"
                              >有効</label
                            >
                            <ToggleSwitch
                              :inputId="displayEditorEnabledInputId(display.id)"
                              :modelValue="isDisplayEnabled(display.id)"
                              @update:modelValue="
                                emit(
                                  'set-display-enabled',
                                  display.id,
                                  Boolean($event)
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
                  </TabPanel>
                </TabPanels>
              </Tabs>
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
import { computed } from 'vue'
import PlaylistEditor from '../PlaylistEditor.vue'
import { getPlaylistById, getPrimaryDisplay } from '../../shared/player-config'
import type {
  DisplayInfo,
  PlayerConfig,
  PlaylistConfig,
  PlaylistItem
} from '../../shared/types'

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
  'set-display-enabled': [displayId: string, enabled: boolean]
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

/** Builds a stable input id for display-specific editor toggles. */
const displayEditorEnabledInputId = (displayId: string) =>
  `display-editor-enabled-${displayId}`

/** Resolves the current enabled state for a display override. */
const isDisplayEnabled = (displayId: string) =>
  props.config.displays[displayId]?.enabled ?? true

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

    :where(.p-inputnumber, .p-select, .p-inputtext),
    .p-inputnumber-input,
    .p-select-label {
      width: 100%;
    }
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

    &-compact {
      gap: 8px;
      padding: 7px 10px;
      border-radius: 999px;
      background: var(--panel-soft-strong);
    }

    &-toggle {
      align-items: flex-start;
    }
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
      background: color-mix(in srgb, var(--accent-soft), white 56%);
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
    :where(.p-tabs) {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    :where(.p-tablist) {
      gap: 6px;
      border-bottom: 1px solid var(--line-subtle);
    }

    :where(.p-tab) {
      padding-inline: 14px;
      color: var(--muted);
      border-radius: 999px 999px 0 0;
    }

    :where(.p-tab-active) {
      color: var(--ink);
    }

    :where(.p-tabpanels) {
      flex: 1;
      overflow: auto;
      padding: 0;
    }

    :where(.p-tabpanel) {
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

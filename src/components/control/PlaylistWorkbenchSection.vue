<template>
  <section class="playlist-section">
    <div class="section-heading">
      <div>
        <p class="section-kicker">プレイリスト</p>
        <h2>プレイリスト</h2>
      </div>

      <div class="section-copy-stack">
        <p class="section-copy">
          左で管理し、右で選んだプレイリストを編集いたします。再生に使う対象もここで切り替えます。
        </p>
        <div class="status-cluster">
          <Tag :value="selectedPlaylistCountLabel" severity="secondary" />
          <Tag :value="selectedPlaylist.name" severity="info" />
        </div>
      </div>
    </div>

    <Splitter class="playlist-workbench">
      <SplitterPanel :size="28" :minSize="22">
        <aside class="playlist-pane">
          <div class="playlist-pane-header">
            <div>
              <h3>一覧</h3>
              <p class="surface-note">
                {{ playlistCatalogCountLabel }}
              </p>
            </div>

            <div class="row">
              <Button
                label="追加"
                icon="pi pi-plus"
                size="small"
                data-testid="playlist-add-button"
                @click="emit('add-playlist')"
              />
              <Button
                label="複製"
                icon="pi pi-copy"
                size="small"
                severity="secondary"
                @click="emit('duplicate-selected-playlist')"
              />
              <Button
                label="削除"
                icon="pi pi-trash"
                size="small"
                severity="danger"
                text
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
        </aside>
      </SplitterPanel>

      <SplitterPanel :size="72" :minSize="52">
        <section class="playlist-detail">
          <div class="playlist-detail-bar">
            <div class="playlist-detail-status">
              <strong class="playlist-detail-title">{{
                selectedPlaylist.name
              }}</strong>
              <span class="surface-note">{{
                selectedPlaylistStatusMessage
              }}</span>
            </div>
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
                severity="secondary"
                @click="emit('set-active-playlist', selectedPlaylist.id)"
              />
              <Button
                icon="pi pi-arrow-up"
                text
                severity="secondary"
                aria-label="プレイリストを上へ移動"
                :disabled="!canMoveSelectedPlaylistUp"
                @click="emit('move-selected-playlist', -1)"
              />
              <Button
                icon="pi pi-arrow-down"
                text
                severity="secondary"
                aria-label="プレイリストを下へ移動"
                :disabled="!canMoveSelectedPlaylistDown"
                @click="emit('move-selected-playlist', 1)"
              />
            </div>
          </div>

          <div class="playlist-detail-body">
            <div class="field-grid field-grid-2">
              <div class="field">
                <label :for="playlistNameInputId">プレイリスト名</label>
                <InputText
                  :id="playlistNameInputId"
                  :modelValue="selectedPlaylist.name"
                  class="w-full"
                  @update:modelValue="
                    emit('rename-selected-playlist', String($event ?? ''))
                  "
                />
              </div>

              <div
                class="field-inline field-inline-toggle"
                data-testid="per-display-controls"
              >
                <div class="field-copy">
                  <label :for="perDisplayInputId"
                    >モニター個別に内容を分ける</label
                  >
                  <p class="surface-note">
                    ON
                    にすると、このプレイリストだけディスプレイごとの差分を編集できます。
                  </p>
                </div>
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

            <div class="field-grid field-grid-2">
              <div class="field-inline">
                <label :for="playlistLoopInputId">ループ再生</label>
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

              <div class="field-inline">
                <label :for="playlistShuffleInputId">シャッフル</label>
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

            <div class="field-grid field-grid-2">
              <div class="field">
                <label :for="playlistDefaultDurationInputId"
                  >既定表示時間（秒）</label
                >
                <InputNumber
                  :inputId="playlistDefaultDurationInputId"
                  :modelValue="selectedPlaylist.defaultDurationSec"
                  :min="2"
                  :max="36000"
                  @update:modelValue="
                    emit('update-selected-playlist-default-duration', $event)
                  "
                />
              </div>

              <div class="field">
                <label :for="playlistWebTimeoutInputId"
                  >Web 読込待機時間（秒）</label
                >
                <InputNumber
                  :inputId="playlistWebTimeoutInputId"
                  :modelValue="selectedPlaylist.webTimeoutSec"
                  :min="2"
                  :max="120"
                  @update:modelValue="
                    emit('update-selected-playlist-web-timeout', $event)
                  "
                />
              </div>
            </div>

            <div v-if="selectedPlaylist.perDisplay" class="playlist-tab-shell">
              <Tabs
                :value="selectedPlaylistScope"
                @update:value="emit('update-selected-playlist-scope', $event)"
              >
                <TabList>
                  <Tab value="shared">共通</Tab>
                  <Tab
                    v-for="display in displayInfos"
                    :key="display.id"
                    :value="display.id"
                  >
                    {{ display.label }}
                  </Tab>
                </TabList>

                <TabPanels>
                  <TabPanel value="shared">
                    <div class="playlist-editor-shell">
                      <p class="surface-note">
                        個別設定を持つ前の基準内容です。新しいディスプレイを検出した際の初期値にもなります。
                      </p>

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
                    v-for="display in displayInfos"
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
        </section>
      </SplitterPanel>
    </Splitter>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PlaylistEditor from '../PlaylistEditor.vue'
import { getPlaylistById } from '../../shared/player-config'
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

const selectedPlaylistCountLabel = computed(
  () => `${props.config.playlists.length} 件を保持`
)
const playlistCatalogCountLabel = computed(
  () => `${props.config.playlists.length} 件を保持しています。`
)
const isSelectedPlaylistActive = computed(
  () => props.selectedPlaylist.id === props.config.activePlaylistId
)
const selectedPlaylistStatusMessage = computed(() =>
  isSelectedPlaylistActive.value
    ? 'このプレイリストが現在の再生対象です。'
    : 'このプレイリストは保存されますが、現在は再生対象ではありません。'
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
  gap: 16px;
  padding: 20px 22px;
  border-radius: 22px;
  background: var(--panel);
  border: 1px solid var(--line-subtle);
  box-shadow: var(--shadow);

  :where(.p-button) {
    white-space: nowrap;
    min-height: 34px;

    &.p-button-text {
      min-height: 30px;
    }
  }

  :where(.p-inputtext, .p-inputnumber-input) {
    background: var(--p-form-field-background);
    border: 1px solid var(--p-form-field-border-color);
    color: var(--p-form-field-color);
    min-height: 36px;
    font-size: 14px;

    &::placeholder {
      color: var(--p-form-field-placeholder-color);
    }

    &:focus {
      border-color: var(--focus-line);
      box-shadow: 0 0 0 3px var(--focus-ring);
    }
  }

  .surface-note {
    font-size: 12.5px;
    color: var(--muted);
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .status-cluster,
  .row,
  .display-summary-actions,
  .playlist-detail-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .section-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(240px, 420px);
    gap: 16px;
    align-items: start;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--line-subtle);

    h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      text-wrap: balance;
      color: var(--ink);
    }
  }

  .section-kicker {
    margin: 0 0 6px;
    color: var(--accent);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .section-copy {
    margin: 0;
    color: var(--muted);
    line-height: 1.55;
  }

  .section-copy-stack {
    display: grid;
    gap: 10px;
    justify-items: end;
  }

  .field-grid {
    display: grid;
    gap: 14px;

    &-2 {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
  }

  .field {
    display: grid;
    gap: 8px;

    label {
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    :where(.p-inputnumber, .p-select, .p-inputtext),
    .p-inputnumber-input,
    .p-select-label {
      width: 100%;
    }
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
      border-radius: 10px;
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
    min-height: clamp(520px, 60vh, 680px);
    border: 1px solid var(--line-strong);
    border-radius: 18px;
    overflow: hidden;
    background: var(--panel-soft);

    :where(.p-splitter-gutter) {
      background: color-mix(in srgb, var(--line-strong), transparent 30%);
    }

    :where(.p-splitterpanel) {
      min-width: 0;
    }
  }

  .playlist-pane,
  .playlist-detail {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .playlist-pane {
    padding: 16px;
    gap: 14px;
    background: var(--panel-soft-strong);
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
      font-size: 20px;
      font-weight: 700;
      color: var(--ink);
    }
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
    background: color-mix(in srgb, var(--p-surface-0), transparent 8%);
    border-radius: 14px;
    padding: 12px 14px;
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
      border-color: color-mix(in srgb, var(--accent), transparent 38%);
      background: var(--panel-soft-emphasis);
      box-shadow: inset 0 0 0 1px
        color-mix(in srgb, var(--accent), transparent 82%);
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

  .playlist-detail {
    padding: 18px;
    gap: 16px;
    background: color-mix(in srgb, var(--p-surface-0), transparent 10%);
  }

  .playlist-detail-bar {
    padding-bottom: 4px;
    border-bottom: 1px solid var(--line-subtle);
  }

  .playlist-detail-status {
    display: grid;
    gap: 6px;
    min-width: 0;
    flex: 1 1 280px;
  }

  .playlist-detail-title {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
    color: var(--ink);
    text-wrap: balance;
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
    gap: 14px;
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
    padding: 12px 0 0;
  }

  .playlist-tab-shell {
    :where(.p-tabs) {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    :where(.p-tablist) {
      gap: 4px;
      border-bottom: 1px solid var(--line-strong);
    }

    :where(.p-tab) {
      padding-inline: 16px;
      color: var(--muted);
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

@media (max-width: 1180px) {
  .playlist-section {
    .section-heading {
      grid-template-columns: 1fr;
    }

    .section-copy-stack {
      justify-items: start;
    }
  }
}
</style>

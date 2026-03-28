<template>
  <div class="control-layout">
    <header class="control-hero">
      <div class="hero-copy">
        <p class="section-kicker">ローカル設定</p>
        <h1>Futa-e</h1>
        <p>ローカル環境専用のディスプレイ再生コントローラーです。</p>
      </div>

      <div class="hero-toolbar">
        <div class="status-cluster">
          <Tag value="自動保存" severity="secondary" />
          <Tag :value="statusLabel" severity="info" />
          <Tag :value="persistenceModeLabel" severity="secondary" />
          <span class="surface-note"
            >接続ディスプレイ {{ displayInfos.length }} 台</span
          >
          <span class="surface-note">再生中 {{ status.displayCount }} 台</span>
        </div>

        <div class="action-cluster">
          <Button
            label="再読込"
            icon="pi pi-refresh"
            severity="secondary"
            :disabled="!isConfigReady"
            @click="loadConfig"
          />
          <Button
            label="開始"
            icon="pi pi-play"
            severity="success"
            :disabled="!isConfigReady"
            @click="startPlayer"
          />
          <Button
            label="停止"
            icon="pi pi-stop"
            severity="secondary"
            :disabled="!isConfigReady"
            @click="stopPlayer"
          />
        </div>

        <span class="surface-note">{{ persistenceStatusLabel }}</span>
      </div>
    </header>

    <div v-if="isConfigReady" class="control-surface">
      <section class="settings-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">システム</p>
            <h2>再生とディスプレイ</h2>
          </div>
          <p class="section-copy">
            接続中ディスプレイの有効状態をここで整えます。
          </p>
        </div>

        <section class="settings-block">
          <header class="subsection-heading">
            <div>
              <h3>ディスプレイ</h3>
              <p>有効を切ると、個別設定を使う再生時だけ対象から外れます。</p>
            </div>
          </header>

          <div v-if="displayInfos.length > 0" class="display-list">
            <div
              v-for="display in displayInfos"
              :key="display.id"
              class="display-summary display-summary-dense"
            >
              <div class="display-copy">
                <strong>{{ display.label }}</strong>
                <span class="surface-note">
                  {{ display.bounds.width }} x {{ display.bounds.height }}
                </span>
              </div>

              <div class="display-summary-actions">
                <Tag
                  :value="display.isPrimary ? 'メイン' : '画面'"
                  severity="secondary"
                />
                <div class="field-inline field-inline-compact">
                  <label :for="displayEnabledInputId(display.id)">有効</label>
                  <ToggleSwitch
                    :inputId="displayEnabledInputId(display.id)"
                    :modelValue="config.displays[display.id]?.enabled ?? true"
                    @update:modelValue="
                      setDisplayEnabled(display.id, Boolean($event))
                    "
                  />
                </div>
              </div>
            </div>
          </div>

          <p v-else class="surface-note">
            ディスプレイはまだ検出できておりません。
          </p>
        </section>
      </section>

      <Divider />

      <section class="settings-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">プレイリスト</p>
            <h2>プレイリスト</h2>
          </div>
          <p class="section-copy">
            左で管理し、右で選んだプレイリストを編集いたします。再生に使う対象もここで切り替えます。
          </p>
        </div>

        <Splitter class="playlist-workbench">
          <SplitterPanel :size="28" :minSize="22">
            <aside class="playlist-pane">
              <div class="playlist-pane-header">
                <div>
                  <h3>一覧</h3>
                  <p class="surface-note">
                    {{ config.playlists.length }} 件を保持しています。
                  </p>
                </div>

                <div class="row">
                  <Button
                    label="追加"
                    icon="pi pi-plus"
                    size="small"
                    data-testid="playlist-add-button"
                    @click="addPlaylist"
                  />
                  <Button
                    label="複製"
                    icon="pi pi-copy"
                    size="small"
                    severity="secondary"
                    :disabled="!selectedPlaylist"
                    @click="duplicateSelectedPlaylist"
                  />
                  <Button
                    label="削除"
                    icon="pi pi-trash"
                    size="small"
                    severity="danger"
                    text
                    :disabled="
                      config.playlists.length <= 1 || !selectedPlaylist
                    "
                    @click="removeSelectedPlaylist"
                  />
                </div>
              </div>

              <div class="playlist-catalog" data-testid="playlist-list">
                <button
                  v-for="playlist in config.playlists"
                  :key="playlist.id"
                  type="button"
                  class="playlist-summary"
                  :class="{
                    'is-selected': playlist.id === selectedPlaylist.id
                  }"
                  data-testid="playlist-list-item"
                  @click="selectPlaylist(playlist.id)"
                >
                  <div class="playlist-summary-copy">
                    <strong>{{ playlist.name }}</strong>
                    <span class="surface-note">
                      項目 {{ playlist.items.length }} 件
                    </span>
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
                  <span class="surface-note">
                    {{
                      selectedPlaylist.id === config.activePlaylistId
                        ? 'このプレイリストが現在の再生対象です。'
                        : 'このプレイリストは保存されますが、現在は再生対象ではありません。'
                    }}
                  </span>
                </div>
                <div class="playlist-detail-actions">
                  <Tag
                    v-if="selectedPlaylist.id === config.activePlaylistId"
                    value="現在の再生対象"
                    severity="success"
                  />
                  <Button
                    v-else
                    label="再生対象にする"
                    icon="pi pi-check"
                    severity="secondary"
                    @click="setActivePlaylist(selectedPlaylist.id)"
                  />
                  <Button
                    icon="pi pi-arrow-up"
                    text
                    severity="secondary"
                    aria-label="プレイリストを上へ移動"
                    :disabled="selectedPlaylistIndex === 0"
                    @click="moveSelectedPlaylist(-1)"
                  />
                  <Button
                    icon="pi pi-arrow-down"
                    text
                    severity="secondary"
                    aria-label="プレイリストを下へ移動"
                    :disabled="
                      selectedPlaylistIndex === config.playlists.length - 1
                    "
                    @click="moveSelectedPlaylist(1)"
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
                        renameSelectedPlaylist(String($event ?? ''))
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
                        toggleSelectedPlaylistPerDisplay(Boolean($event))
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
                        updateSelectedPlaylistSettings({
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
                        updateSelectedPlaylistSettings({
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
                        updateSelectedPlaylistDefaultDuration($event)
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
                        updateSelectedPlaylistWebTimeout($event)
                      "
                    />
                  </div>
                </div>

                <div
                  v-if="selectedPlaylist.perDisplay"
                  class="playlist-tab-shell"
                >
                  <Tabs
                    :value="selectedPlaylistScope"
                    @update:value="updateSelectedPlaylistScope"
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
                            @update:playlist="updateSelectedSharedPlaylist"
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
                                  :inputId="
                                    displayEditorEnabledInputId(display.id)
                                  "
                                  :modelValue="
                                    config.displays[display.id]?.enabled ?? true
                                  "
                                  @update:modelValue="
                                    setDisplayEnabled(
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
                              (playlist) =>
                                updateSelectedDisplayPlaylist(
                                  display.id,
                                  playlist
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
                    @update:playlist="updateSelectedSharedPlaylist"
                  />
                </div>
              </div>
            </section>
          </SplitterPanel>
        </Splitter>
      </section>
    </div>

    <div v-else class="control-surface">
      <p class="surface-note">設定を読み込んでおります。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRaw } from 'vue'
import PlaylistEditor from '../components/PlaylistEditor.vue'
import { getFutaeApi } from '../shared/api'
import { createAutoSaveController } from '../shared/config-autosave'
import type { ConfigDiagnostics } from '../shared/ipc'
import {
  createDefaultConfig,
  createDefaultPlaylistConfig
} from '../shared/defaults'
import {
  ensureDisplayConfigs,
  getPlaylistById,
  replacePlaylistById,
  replacePlaylistItemsById,
  replacePlaylistNameById,
  replacePlaylistPerDisplayById,
  replacePlaylistSettingsById
} from '../shared/player-config'
import type {
  DisplayConfig,
  DisplayInfo,
  PlayerConfig,
  PlayerStatus,
  PlaylistConfig,
  PlaylistItem
} from '../shared/types'
import { createId } from '../shared/utils'

const api = getFutaeApi()

const playlistNameInputId = 'control-playlist-name'
const perDisplayInputId = 'control-playlist-per-display'
const playlistLoopInputId = 'control-playlist-loop'
const playlistShuffleInputId = 'control-playlist-shuffle'
const playlistDefaultDurationInputId = 'control-playlist-default-duration'
const playlistWebTimeoutInputId = 'control-playlist-web-timeout'

const config = ref<PlayerConfig>(createDefaultConfig())
const configDiagnostics = ref<ConfigDiagnostics | null>(null)
const isConfigReady = ref(false)
const displayInfos = ref<DisplayInfo[]>([])
const status = ref<PlayerStatus>({
  running: false,
  displayCount: 0
})
const selectedPlaylistId = ref('')
const selectedPlaylistScope = ref('shared')

let removeDisplayListener: (() => void) | null = null

const statusLabel = computed(() => (status.value.running ? '再生中' : '停止中'))
const persistenceModeLabel = computed(() => {
  if (!configDiagnostics.value) {
    return '保存先確認中'
  }

  return configDiagnostics.value.backend === 'electron-store'
    ? 'Electron Store'
    : 'ブラウザ Mock'
})
const persistenceStatusLabel = computed(() => {
  if (!configDiagnostics.value) {
    return '保存先を確認しております。'
  }

  if (configDiagnostics.value.backend !== 'electron-store') {
    return 'ブラウザ mock で動作中です。electron-store は使用しておりません。'
  }

  return configDiagnostics.value.configExists
    ? `保存先 ${configDiagnostics.value.configPath}`
    : `保存先 ${configDiagnostics.value.configPath}（次回保存時に作成されます）`
})
const selectedPlaylist = computed(() =>
  getPlaylistById(
    config.value.playlists,
    selectedPlaylistId.value || config.value.activePlaylistId
  )
)
const selectedPlaylistIndex = computed(() =>
  config.value.playlists.findIndex(
    (playlist) => playlist.id === selectedPlaylist.value.id
  )
)

const displayEnabledInputId = (displayId: string) =>
  `display-enabled-${displayId}`

const displayEditorEnabledInputId = (displayId: string) =>
  `display-editor-enabled-${displayId}`

const getDisplayConfig = (displayId: string): DisplayConfig =>
  config.value.displays[displayId] ?? {
    enabled: true,
    playlists: config.value.playlists.map((playlist) => clonePlaylist(playlist))
  }

const cloneItems = (items: PlaylistItem[]): PlaylistItem[] =>
  items.map((item) => ({ ...item }))

const clonePlaylist = (playlist: PlaylistConfig): PlaylistConfig => ({
  ...playlist,
  items: cloneItems(playlist.items)
})

const nextPlaylistName = () => {
  const names = new Set(config.value.playlists.map((playlist) => playlist.name))
  let index = 1

  while (names.has(`プレイリスト ${index}`)) {
    index += 1
  }

  return `プレイリスト ${index}`
}

const nextDuplicateName = (name: string) => {
  const names = new Set(config.value.playlists.map((playlist) => playlist.name))
  let index = 1
  let candidate = `${name} のコピー`

  while (names.has(candidate)) {
    index += 1
    candidate = `${name} のコピー ${index}`
  }

  return candidate
}

const syncSelection = () => {
  const nextSelected = getPlaylistById(
    config.value.playlists,
    selectedPlaylistId.value || config.value.activePlaylistId
  )

  selectedPlaylistId.value = nextSelected.id

  if (
    !nextSelected.perDisplay ||
    (selectedPlaylistScope.value !== 'shared' &&
      !displayInfos.value.some(
        (display) => display.id === selectedPlaylistScope.value
      ))
  ) {
    selectedPlaylistScope.value = 'shared'
  }
}

const syncDisplays = (displays: DisplayInfo[]) => {
  displayInfos.value = displays
  config.value = ensureDisplayConfigs(config.value, displays)
  autoSave.touch()
  syncSelection()
}

const persistConfig = async (next: PlayerConfig) => {
  const rawConfig = structuredClone(toRaw(next))
  const prepared = ensureDisplayConfigs(
    {
      ...rawConfig,
      updatedAt: new Date().toISOString()
    },
    displayInfos.value
  )

  return api.config.save(prepared)
}

const autoSave = createAutoSaveController({
  onError: (error) => {
    console.error('Failed to auto-save config.', error)
  },
  persist: persistConfig,
  source: config
})

const updateConfigState = (
  next: PlayerConfig,
  options: {
    syncCurrentSelection?: boolean
    touchAutoSave?: boolean
  } = {}
) => {
  const { syncCurrentSelection = true, touchAutoSave = true } = options

  config.value = ensureDisplayConfigs(next, displayInfos.value)

  if (touchAutoSave) {
    autoSave.touch()
  }

  if (syncCurrentSelection) {
    syncSelection()
  }
}

const loadConfig = async () => {
  autoSave.pause()
  isConfigReady.value = false
  const [nextDiagnostics, nextConfig, nextDisplays, nextStatus] =
    await Promise.all([
      api.config.getDiagnostics(),
      api.config.get(),
      api.displays.list(),
      api.player.status()
    ])

  configDiagnostics.value = nextDiagnostics
  displayInfos.value = nextDisplays
  config.value = ensureDisplayConfigs(nextConfig, nextDisplays)
  syncSelection()
  autoSave.resume(config.value)
  status.value = nextStatus
  isConfigReady.value = true
}

const selectPlaylist = (playlistId: string) => {
  selectedPlaylistId.value = playlistId
  selectedPlaylistScope.value = 'shared'
}

const setActivePlaylist = (playlistId: string) => {
  updateConfigState(
    {
      ...config.value,
      activePlaylistId: playlistId
    },
    { syncCurrentSelection: true, touchAutoSave: true }
  )
}

const setDisplayEnabled = (displayId: string, enabled: boolean) => {
  const displayConfig = getDisplayConfig(displayId)

  updateConfigState(
    {
      ...config.value,
      displays: {
        ...config.value.displays,
        [displayId]: {
          ...displayConfig,
          enabled
        }
      }
    },
    { syncCurrentSelection: false, touchAutoSave: true }
  )
}

const updateSelectedPlaylistScope = (
  value: string | number | null | undefined
) => {
  selectedPlaylistScope.value = value ? String(value) : 'shared'
}

const updateSelectedSharedPlaylist = (playlist: PlaylistItem[]) => {
  const playlistId = selectedPlaylist.value.id
  const nextPlaylists = replacePlaylistItemsById(
    config.value.playlists,
    playlistId,
    playlist
  )

  const nextDisplays = selectedPlaylist.value.perDisplay
    ? config.value.displays
    : Object.fromEntries(
        Object.entries(config.value.displays).map(
          ([displayId, displayConfig]) => [
            displayId,
            {
              ...displayConfig,
              playlists: replacePlaylistItemsById(
                displayConfig.playlists,
                playlistId,
                playlist
              )
            }
          ]
        )
      )

  updateConfigState(
    {
      ...config.value,
      playlists: nextPlaylists,
      displays: nextDisplays
    },
    { syncCurrentSelection: false, touchAutoSave: true }
  )
}

const updateSelectedDisplayPlaylist = (
  displayId: string,
  playlist: PlaylistItem[]
) => {
  const displayConfig = getDisplayConfig(displayId)

  updateConfigState(
    {
      ...config.value,
      displays: {
        ...config.value.displays,
        [displayId]: {
          ...displayConfig,
          playlists: replacePlaylistItemsById(
            displayConfig.playlists,
            selectedPlaylist.value.id,
            playlist
          )
        }
      }
    },
    { syncCurrentSelection: false, touchAutoSave: true }
  )
}

const renameSelectedPlaylist = (name: string) => {
  updateConfigState(
    {
      ...config.value,
      playlists: replacePlaylistNameById(
        config.value.playlists,
        selectedPlaylist.value.id,
        name
      )
    },
    { syncCurrentSelection: false, touchAutoSave: true }
  )
}

const toggleSelectedPlaylistPerDisplay = (enabled: boolean) => {
  const playlistId = selectedPlaylist.value.id
  const nextPlaylists = replacePlaylistPerDisplayById(
    config.value.playlists,
    playlistId,
    enabled
  )
  const nextSharedPlaylist = getPlaylistById(nextPlaylists, playlistId)

  const nextDisplays = Object.fromEntries(
    Object.entries(config.value.displays).map(([displayId, displayConfig]) => [
      displayId,
      {
        ...displayConfig,
        playlists: replacePlaylistById(
          displayConfig.playlists,
          playlistId,
          () => clonePlaylist(nextSharedPlaylist)
        )
      }
    ])
  )

  updateConfigState(
    {
      ...config.value,
      playlists: nextPlaylists,
      displays: nextDisplays
    },
    { syncCurrentSelection: true, touchAutoSave: true }
  )
  selectedPlaylistScope.value = 'shared'
}

const updateSelectedPlaylistSettings = (
  settings: Partial<
    Pick<
      PlaylistConfig,
      'loop' | 'shuffle' | 'defaultDurationSec' | 'webTimeoutSec'
    >
  >
) => {
  updateConfigState(
    {
      ...config.value,
      playlists: replacePlaylistSettingsById(
        config.value.playlists,
        selectedPlaylist.value.id,
        settings
      )
    },
    { syncCurrentSelection: false, touchAutoSave: true }
  )
}

const updateSelectedPlaylistDefaultDuration = (
  value: number | null | undefined
) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return
  }

  updateSelectedPlaylistSettings({
    defaultDurationSec: value
  })
}

const updateSelectedPlaylistWebTimeout = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return
  }

  updateSelectedPlaylistSettings({
    webTimeoutSec: value
  })
}

const displayPlaylist = (displayId: string) =>
  getPlaylistById(
    config.value.displays[displayId]?.playlists,
    selectedPlaylist.value.id
  )

const addPlaylist = () => {
  const playlist = createDefaultPlaylistConfig(nextPlaylistName())
  const nextPlaylists = [...config.value.playlists, playlist]

  updateConfigState(
    {
      ...config.value,
      playlists: nextPlaylists
    },
    { syncCurrentSelection: false, touchAutoSave: true }
  )
  selectedPlaylistId.value = playlist.id
  selectedPlaylistScope.value = 'shared'
}

const duplicateSelectedPlaylist = () => {
  const source = selectedPlaylist.value
  const duplicateId = createId()
  const duplicatePlaylist: PlaylistConfig = {
    ...clonePlaylist(source),
    id: duplicateId,
    name: nextDuplicateName(source.name)
  }
  const insertIndex = selectedPlaylistIndex.value + 1
  const nextPlaylists = [...config.value.playlists]
  nextPlaylists.splice(insertIndex, 0, duplicatePlaylist)

  const nextDisplays = Object.fromEntries(
    Object.entries(config.value.displays).map(([displayId, displayConfig]) => {
      const sourceDisplayPlaylist = getPlaylistById(
        displayConfig.playlists,
        source.id
      )
      const duplicateDisplayPlaylist = source.perDisplay
        ? {
            ...clonePlaylist(sourceDisplayPlaylist),
            id: duplicateId,
            name: duplicatePlaylist.name,
            perDisplay: duplicatePlaylist.perDisplay
          }
        : clonePlaylist(duplicatePlaylist)
      const nextDisplayPlaylists = [...displayConfig.playlists]
      nextDisplayPlaylists.splice(insertIndex, 0, duplicateDisplayPlaylist)

      return [
        displayId,
        {
          ...displayConfig,
          playlists: nextDisplayPlaylists
        }
      ]
    })
  )

  updateConfigState(
    {
      ...config.value,
      playlists: nextPlaylists,
      displays: nextDisplays
    },
    { syncCurrentSelection: false, touchAutoSave: true }
  )
  selectedPlaylistId.value = duplicateId
  selectedPlaylistScope.value = 'shared'
}

const removeSelectedPlaylist = () => {
  if (config.value.playlists.length <= 1) {
    return
  }

  const removeIndex = selectedPlaylistIndex.value
  const removeId = selectedPlaylist.value.id
  const nextPlaylists = config.value.playlists.filter(
    (playlist) => playlist.id !== removeId
  )
  const fallbackPlaylist =
    nextPlaylists[removeIndex] ?? nextPlaylists[removeIndex - 1]

  updateConfigState(
    {
      ...config.value,
      activePlaylistId:
        config.value.activePlaylistId === removeId
          ? fallbackPlaylist.id
          : config.value.activePlaylistId,
      playlists: nextPlaylists,
      displays: Object.fromEntries(
        Object.entries(config.value.displays).map(
          ([displayId, displayConfig]) => [
            displayId,
            {
              ...displayConfig,
              playlists: displayConfig.playlists.filter(
                (playlist) => playlist.id !== removeId
              )
            }
          ]
        )
      )
    },
    { syncCurrentSelection: false, touchAutoSave: true }
  )
  selectedPlaylistId.value = fallbackPlaylist.id
  selectedPlaylistScope.value = 'shared'
}

const moveSelectedPlaylist = (offset: -1 | 1) => {
  const from = selectedPlaylistIndex.value
  const to = from + offset

  if (from < 0 || to < 0 || to >= config.value.playlists.length) {
    return
  }

  const nextPlaylists = [...config.value.playlists]
  const [moved] = nextPlaylists.splice(from, 1)
  nextPlaylists.splice(to, 0, moved)

  updateConfigState(
    {
      ...config.value,
      playlists: nextPlaylists
    },
    { syncCurrentSelection: false, touchAutoSave: true }
  )
  selectedPlaylistId.value = moved.id
}

const startPlayer = async () => {
  await autoSave.flush()
  status.value = await api.player.start()
}

const stopPlayer = async () => {
  status.value = await api.player.stop()
}

onMounted(async () => {
  await loadConfig()
  removeDisplayListener = api.displays.onChanged((displays) => {
    syncDisplays(displays)
  })
})

onBeforeUnmount(() => {
  removeDisplayListener?.()
  void autoSave
    .flush()
    .catch((error) => {
      console.error('Failed to flush config before closing.', error)
    })
    .finally(() => {
      autoSave.stop()
    })
})
</script>

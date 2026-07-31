<template>
  <div class="panel-content">
    <section class="playlist-items-shell">
      <div class="playlist-items-header">
        <div class="playlist-items-copy">
          <strong class="playlist-items-title">プレイリスト項目</strong>
          <p v-if="singleItemMode" class="playlist-meta">
            追加すると現在の項目を置き換えます。
          </p>
        </div>

        <ElButton
          :icon="Plus"
          type="primary"
          size="small"
          data-testid="playlist-item-add-button"
          @click="openDraftDialog"
        >
          追加
        </ElButton>
      </div>

      <p
        v-if="playlist.length === 0"
        class="playlist-meta playlist-empty-state"
      >
        {{ emptyMessage }}
      </p>

      <ElTimeline
        v-else
        data-testid="playlist-item-timeline"
        class="playlist-list playlist-timeline"
      >
        <ElTimelineItem
          v-for="entry in timelineEntries"
          :key="entry.item.id"
          hide-timestamp
        >
          <div class="timeline-entry">
            <div class="playlist-step">
              <span class="playlist-step-index">
                {{ timelineIndexLabel(entry.index) }}
              </span>
              <span class="playlist-step-copy">
                {{ playbackMetaLabel(entry.item) }}
              </span>
            </div>

            <div class="marker-track" aria-hidden="true">
              <span class="playlist-marker" :class="`is-${entry.item.type}`">
                <component :is="itemIcon(entry.item.type)" />
              </span>
            </div>

            <div class="playlist-item">
              <div class="playlist-item-header">
                <div class="playlist-item-copy">
                  <strong>{{ itemLabel(entry.item) }}</strong>
                  <div class="playlist-meta">
                    {{ itemSourceLabel(entry.item) }}
                  </div>
                  <div v-if="itemStateLabel(entry.item)" class="playlist-meta">
                    {{ itemStateLabel(entry.item) }}
                  </div>
                </div>
                <ElTag
                  v-if="getItemPlaybackMode(entry.item) === 'forever'"
                  type="info"
                >
                  無期限
                </ElTag>
              </div>

              <div class="playlist-item-actions">
                <ElButton
                  :icon="EditPen"
                  text
                  circle
                  type="info"
                  aria-label="項目を編集"
                  @click="openEditDialog(entry.index)"
                />
                <ElButton
                  v-if="!singleItemMode"
                  :icon="ArrowUp"
                  text
                  circle
                  type="info"
                  aria-label="項目を上へ移動"
                  :disabled="entry.index === 0"
                  @click="moveItem(entry.index, -1)"
                />
                <ElButton
                  v-if="!singleItemMode"
                  :icon="ArrowDown"
                  text
                  circle
                  type="info"
                  aria-label="項目を下へ移動"
                  :disabled="entry.index === playlist.length - 1"
                  @click="moveItem(entry.index, 1)"
                />
                <ElButton
                  :icon="Delete"
                  text
                  circle
                  type="danger"
                  aria-label="項目を削除"
                  @click="removeItem(entry.index)"
                />
              </div>
            </div>
          </div>
        </ElTimelineItem>
      </ElTimeline>
    </section>

    <ElDialog
      v-model="isDraftDialogVisible"
      :title="dialogTitle"
      width="min(42rem, calc(100vw - 32px))"
      :close-on-click-modal="false"
      class="playlist-dialog"
      header-class="playlist-dialog-header"
      body-class="playlist-dialog-body"
      footer-class="playlist-dialog-footer"
    >
      <div class="playlist-composer">
        <div class="field">
          <label :id="typeLabelId">種類</label>
          <ElSegmented
            :id="typeSegmentedId"
            :model-value="draftType"
            :options="typeOptions"
            :aria-labelledby="typeLabelId"
            size="small"
            class="choice-group"
            @update:model-value="handleDraftTypeChange"
          />
        </div>

        <div v-if="draftType !== 'web'" class="field">
          <label :id="sourceModeLabelId">入力方法</label>
          <ElSegmented
            :id="sourceModeSegmentedId"
            :model-value="draftSourceMode"
            :options="sourceModeOptions"
            :aria-labelledby="sourceModeLabelId"
            size="small"
            class="choice-group"
            @update:model-value="handleDraftSourceModeChange"
          />
        </div>

        <div v-if="draftSourceMode === 'url'" class="field">
          <label :for="urlInputId">URL</label>
          <ElInput
            :id="urlInputId"
            v-model="urlInput"
            type="url"
            inputmode="url"
            size="small"
            placeholder="https://example.com/asset"
            class="w-full"
            :aria-describedby="
              draftType === 'web' ? webUrlDescriptionIds : undefined
            "
            :aria-invalid="showWebUrlError ? 'true' : undefined"
            @blur="urlInputTouched = true"
          />
          <p v-if="draftType === 'web'" :id="webUrlHintId" class="surface-note">
            Web URL には https:// で始まる URL を入力してください。
          </p>
          <p
            v-if="showWebUrlError"
            :id="webUrlErrorId"
            class="validation-error"
            role="alert"
          >
            有効な HTTPS URL を入力してください。
          </p>
        </div>

        <div v-else class="field-inline">
          <div class="field-copy">
            <strong>{{ fileSelectionTitle }}</strong>
            <p class="surface-note">{{ selectedAssetsLabel }}</p>
          </div>

          <div class="row">
            <ElButton :icon="Files" size="small" plain @click="pickDraftFiles">
              ファイルを選択
            </ElButton>
            <ElButton
              v-if="draftAssets.length > 0"
              :icon="Close"
              size="small"
              text
              @click="clearDraftFiles"
            >
              クリア
            </ElButton>
          </div>
        </div>

        <div v-if="showDraftDuration" class="field">
          <label :id="playbackModeLabelId">表示方法</label>
          <ElSegmented
            :id="playbackModeSegmentedId"
            :model-value="draftPlaybackMode"
            :options="playbackModeOptions"
            :aria-labelledby="playbackModeLabelId"
            :aria-describedby="playbackModeNoteId"
            size="small"
            class="choice-group playback-choice-group"
            @update:model-value="handleDraftPlaybackModeChange"
          />
          <p :id="playbackModeNoteId" class="surface-note">
            {{ playbackModeNote }}
          </p>
        </div>

        <div
          v-if="showDraftDuration && draftPlaybackMode === 'duration'"
          class="field"
        >
          <label :for="urlDurationInputId">秒数</label>
          <ElInputNumber
            :id="urlDurationInputId"
            :model-value="urlDuration"
            size="small"
            :min="draftDurationMin"
            :max="36000"
            :aria-describedby="playbackModeNoteId"
            @update:model-value="urlDuration = $event ?? null"
            @blur="commitDraftDuration"
          />
        </div>

        <div v-if="draftType === 'video'" class="field-inline">
          <label :for="draftMuteInputId">ミュート</label>
          <ElSwitch
            :id="draftMuteInputId"
            :model-value="draftMute"
            @update:model-value="draftMute = $event === true"
          />
        </div>

        <div
          v-if="allowFallback && draftType === 'web'"
          class="field-inline field-inline-toggle"
        >
          <div class="field-copy">
            <label :for="draftFallbackEnabledId">待機・失敗時の表示</label>
            <p class="surface-note">
              Web の読込待機中または失敗時だけ、代わりの画像を表示します。
            </p>
          </div>
          <ElCheckbox
            :id="draftFallbackEnabledId"
            :model-value="draftFallbackEnabled"
            @update:model-value="handleDraftFallbackToggle($event === true)"
          />
        </div>

        <div
          v-if="allowFallback && draftType === 'web' && draftFallbackEnabled"
          class="field-inline"
        >
          <div class="field-copy">
            <strong>フォールバック画像</strong>
            <p class="surface-note">{{ draftFallbackLabel }}</p>
          </div>

          <div class="row">
            <ElButton
              :icon="Picture"
              size="small"
              plain
              @click="pickDraftFallback"
            >
              画像を選択
            </ElButton>
            <ElButton
              v-if="draftFallback"
              :icon="Close"
              size="small"
              text
              @click="clearDraftFallback"
            >
              クリア
            </ElButton>
          </div>
        </div>

        <p
          v-if="dialogMode === 'add' && singleItemMode"
          class="surface-note playlist-dialog-note"
        >
          決定すると現在の項目を置き換えます。
        </p>
      </div>

      <template #footer>
        <div class="playlist-dialog-actions">
          <ElButton text @click="closeDraftDialog">キャンセル</ElButton>
          <ElButton
            :icon="Check"
            type="primary"
            :disabled="!canSubmitDraft"
            @click="submitDraft"
          >
            {{ dialogSubmitLabel }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  Check,
  Close,
  Delete,
  EditPen,
  Files,
  Monitor,
  Picture,
  Plus,
  VideoCamera
} from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import { getFutaeApi } from '../shared/api'
import {
  getItemPlaybackMode,
  normalizePlaylistItemPlaybackMode
} from '../shared/playback'
import type {
  AssetType,
  PickedAsset,
  PlaylistItem,
  PlaylistItemPlaybackMode
} from '../shared/types'
import {
  clampNumber,
  createId,
  isAllowedWebUrl,
  isDirectMediaUrl,
  titleFromPath
} from '../shared/utils'

type DraftSourceMode = 'file' | 'url'
type ItemDialogMode = 'add' | 'edit'
type PlaylistTimelineEntry = {
  item: PlaylistItem
  index: number
}

const props = withDefaults(
  defineProps<{
    playlist: PlaylistItem[]
    defaultDurationSec: number
    maxItems?: number
    allowFallback?: boolean
    showDraftDuration?: boolean
    emptyMessage?: string
  }>(),
  {
    allowFallback: true,
    showDraftDuration: true,
    emptyMessage: 'まだ項目がありません。ファイルや URL を追加してください。'
  }
)

const emit = defineEmits<{
  'update:playlist': [PlaylistItem[]]
  changed: []
}>()

const api = getFutaeApi()

const urlInputId = createId()
const urlDurationInputId = createId()
const draftFallbackEnabledId = createId()
const draftMuteInputId = createId()
const typeLabelId = createId()
const typeSegmentedId = createId()
const sourceModeLabelId = createId()
const sourceModeSegmentedId = createId()
const playbackModeLabelId = createId()
const playbackModeSegmentedId = createId()
const playbackModeNoteId = createId()
const webUrlHintId = createId()
const webUrlErrorId = createId()

const urlInput = ref('')
const urlInputTouched = ref(false)
const draftType = ref<AssetType>('image')
const draftSourceMode = ref<DraftSourceMode>('file')
const draftPlaybackMode = ref<PlaylistItemPlaybackMode>('auto')
const urlDuration = ref<number | null>(null)
const draftAssets = ref<PickedAsset[]>([])
const draftFallback = ref<string | null>(null)
const draftFallbackName = ref<string | null>(null)
const draftFallbackEnabled = ref(false)
const draftMute = ref(false)
const dialogMode = ref<ItemDialogMode>('add')
const editingItemIndex = ref<number | null>(null)
const isDraftDialogVisible = ref(false)

const typeOptions: Array<{ label: string; value: AssetType }> = [
  { label: '画像', value: 'image' },
  { label: '動画', value: 'video' },
  { label: 'ウェブ', value: 'web' }
]

const sourceModeOptions: Array<{ label: string; value: DraftSourceMode }> = [
  { label: 'ファイル', value: 'file' },
  { label: 'URL', value: 'url' }
]

const autoPlaybackModeLabel = computed(() =>
  draftType.value === 'video' ? '動画尺' : '既定秒'
)
const playbackModeOptions = computed<
  Array<{ label: string; value: PlaylistItemPlaybackMode }>
>(() => [
  { label: autoPlaybackModeLabel.value, value: 'auto' },
  { label: '秒数指定', value: 'duration' },
  { label: '無期限', value: 'forever' }
])
const draftDurationMin = computed(() => (draftType.value === 'video' ? 1 : 2))
const playbackModeNote = computed(() => {
  if (draftPlaybackMode.value === 'forever') {
    return 'この項目に到達すると次へ進まず、表示し続けます。'
  }

  if (draftPlaybackMode.value === 'duration') {
    return '指定した秒数で次の項目へ進みます。'
  }

  return draftType.value === 'video'
    ? '動画の終了時に次の項目へ進みます。'
    : `プレイリスト既定の ${props.defaultDurationSec} 秒で次の項目へ進みます。`
})

const singleItemMode = computed(() => props.maxItems === 1)
const singleDraftSelectionMode = computed(
  () => singleItemMode.value || dialogMode.value === 'edit'
)
const dialogTitle = computed(() =>
  dialogMode.value === 'edit'
    ? 'プレイリスト項目を編集'
    : 'プレイリスト項目を追加'
)
const dialogSubmitLabel = computed(() =>
  dialogMode.value === 'edit' ? '更新' : '決定'
)
const fileSelectionTitle = computed(() =>
  singleDraftSelectionMode.value ? '選択中のメディア' : '追加するファイル'
)
const selectedAssetsLabel = computed(() => {
  if (draftAssets.value.length === 0) {
    return '未選択'
  }

  if (draftAssets.value.length === 1) {
    return assetLabel(draftAssets.value[0])
  }

  return `${draftAssets.value.length} 件選択中`
})

/** Decorates playlist items with indices for the Timeline component. */
const timelineEntries = computed<PlaylistTimelineEntry[]>(() =>
  props.playlist.map((item, index) => ({
    item,
    index
  }))
)
const draftFallbackLabel = computed(() =>
  fallbackLabel(
    draftFallback.value ?? undefined,
    draftFallbackName.value ?? undefined
  )
)
const isDraftWebUrlValid = computed(
  () => draftType.value !== 'web' || isAllowedWebUrl(urlInput.value)
)
const showWebUrlError = computed(
  () =>
    draftType.value === 'web' &&
    urlInputTouched.value &&
    urlInput.value.trim().length > 0 &&
    !isDraftWebUrlValid.value
)
const webUrlDescriptionIds = computed(() =>
  showWebUrlError.value ? `${webUrlHintId} ${webUrlErrorId}` : webUrlHintId
)
const canSubmitDraft = computed(() =>
  draftSourceMode.value === 'url'
    ? urlInput.value.trim().length > 0 && isDraftWebUrlValid.value
    : draftAssets.value.length > 0
)

const itemIcons = {
  image: Picture,
  video: VideoCamera,
  web: Monitor
}

const itemIcon = (type: AssetType) => itemIcons[type]

const timelineIndexLabel = (index: number) => String(index + 1).padStart(2, '0')

const playbackMetaLabel = (item: PlaylistItem) => {
  const playbackMode = getItemPlaybackMode(item)

  if (playbackMode === 'forever') {
    return '無期限'
  }

  if (playbackMode === 'duration' && typeof item.durationSec === 'number') {
    return `${item.durationSec} 秒`
  }

  return item.type === 'video'
    ? '動画尺に従います'
    : `既定 ${props.defaultDurationSec} 秒`
}

const emitPlaylist = (next: PlaylistItem[]) => {
  emit('update:playlist', next)
  emit('changed')
}

/** Opens the add-item dialog with a clean draft state. */
const openDraftDialog = () => {
  resetDraft()
  dialogMode.value = 'add'
  editingItemIndex.value = null
  isDraftDialogVisible.value = true
}

/** Opens the item dialog with the selected item's current values. */
const openEditDialog = (index: number) => {
  const item = props.playlist[index]
  if (!item) {
    return
  }

  urlInputTouched.value = false
  dialogMode.value = 'edit'
  editingItemIndex.value = index
  draftType.value = item.type
  draftPlaybackMode.value = getItemPlaybackMode(item)
  urlDuration.value = item.durationSec ?? null
  draftFallback.value = item.fallbackSrc ?? null
  draftFallbackName.value = item.fallbackName ?? null
  draftFallbackEnabled.value = Boolean(item.fallbackSrc)
  draftMute.value = item.mute ?? false

  if (item.type === 'web') {
    draftSourceMode.value = 'url'
    urlInput.value = item.src
    draftAssets.value = []
  } else if (isDirectMediaUrl(item.src)) {
    draftSourceMode.value = 'url'
    urlInput.value = item.src
    draftAssets.value = []
  } else {
    draftSourceMode.value = 'file'
    urlInput.value = ''
    draftAssets.value = [
      {
        id: item.src,
        type: item.type,
        name: item.sourceName ?? 'ローカル素材'
      }
    ]
  }

  isDraftDialogVisible.value = true
}

/** Closes the add-item dialog and clears the current draft state. */
const closeDraftDialog = () => {
  isDraftDialogVisible.value = false
  resetDraft()
}

/** Returns the persisted duration only when the draft explicitly uses seconds. */
const normalizeDuration = (
  playbackMode: PlaylistItemPlaybackMode,
  type: AssetType,
  value: number | null | undefined
): number | undefined => {
  if (playbackMode !== 'duration') {
    return undefined
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampNumber(value, type === 'video' ? 1 : 2, 36000)
  }

  return clampNumber(props.defaultDurationSec, type === 'video' ? 1 : 2, 36000)
}

/** Fills an empty duration after the explicit duration input loses focus. */
const commitDraftDuration = () => {
  if (draftPlaybackMode.value !== 'duration' || urlDuration.value !== null) {
    return
  }

  urlDuration.value = props.defaultDurationSec
}

/** Builds playback fields from the current draft state. */
const buildPlaybackFields = (type: AssetType) => ({
  playbackMode: draftPlaybackMode.value,
  durationSec: normalizeDuration(
    draftPlaybackMode.value,
    type,
    urlDuration.value
  )
})

const buildItem = (asset: PickedAsset): PlaylistItem => ({
  id: createId(),
  type: asset.type,
  src: asset.id,
  sourceName: asset.name,
  ...buildPlaybackFields(asset.type),
  mute: asset.type === 'video' ? draftMute.value : false
})

const resetDraft = () => {
  urlInput.value = ''
  urlInputTouched.value = false
  draftPlaybackMode.value = 'auto'
  urlDuration.value = null
  draftAssets.value = []
  draftFallback.value = null
  draftFallbackName.value = null
  draftFallbackEnabled.value = false
  draftMute.value = false
  dialogMode.value = 'add'
  editingItemIndex.value = null
  draftSourceMode.value = draftType.value === 'web' ? 'url' : 'file'
}

const mergePlaylist = (items: PlaylistItem[]) => {
  if (typeof props.maxItems === 'number') {
    return props.maxItems === 1
      ? items.slice(0, 1)
      : [...props.playlist, ...items].slice(0, props.maxItems)
  }

  return [...props.playlist, ...items]
}

const selectDraftType = (type: AssetType) => {
  draftType.value = type
  urlInputTouched.value = false
  if (type === 'web') {
    draftSourceMode.value = 'url'
    draftAssets.value = []
    return
  }

  draftSourceMode.value =
    draftSourceMode.value === 'url' ? draftSourceMode.value : 'file'
  draftAssets.value = draftAssets.value.filter((asset) => asset.type === type)
}

const handleDraftTypeChange = (type: AssetType | null | undefined) => {
  if (!type) {
    return
  }

  selectDraftType(type)
}

const handleDraftSourceModeChange = (
  sourceMode: DraftSourceMode | null | undefined
) => {
  if (!sourceMode) {
    return
  }

  draftSourceMode.value = sourceMode
}

/** Updates the draft playback mode and seeds a usable seconds value when needed. */
const handleDraftPlaybackModeChange = (
  playbackMode: PlaylistItemPlaybackMode | null | undefined
) => {
  if (!playbackMode) {
    return
  }

  draftPlaybackMode.value = normalizePlaylistItemPlaybackMode(playbackMode)

  if (draftPlaybackMode.value === 'duration' && urlDuration.value === null) {
    urlDuration.value = props.defaultDurationSec
  }
}

const pickDraftFiles = async () => {
  if (draftType.value === 'web') {
    return
  }

  const assets = await api.assets.pickFiles({ kind: draftType.value })
  draftAssets.value = singleDraftSelectionMode.value
    ? assets.slice(0, 1)
    : assets
}

const clearDraftFiles = () => {
  draftAssets.value = []
}

const handleDraftFallbackToggle = (enabled: boolean) => {
  draftFallbackEnabled.value = enabled
  if (!enabled) {
    draftFallback.value = null
    draftFallbackName.value = null
  }
}

const pickDraftFallback = async () => {
  const assets = await api.assets.pickFiles({ kind: 'image' })
  const asset = assets[0]
  if (!asset) {
    return
  }

  draftFallbackEnabled.value = true
  draftFallback.value = asset.id
  draftFallbackName.value = asset.name
}

const clearDraftFallback = () => {
  draftFallback.value = null
  draftFallbackName.value = null
}

const addDraft = (): boolean => {
  if (!canSubmitDraft.value) {
    return false
  }

  if (draftSourceMode.value === 'file') {
    emitPlaylist(mergePlaylist(draftAssets.value.map(buildItem)))
    resetDraft()
    return true
  }

  const trimmed = urlInput.value.trim()
  if (draftType.value === 'web' && !isAllowedWebUrl(trimmed)) {
    urlInputTouched.value = true
    return false
  }

  emitPlaylist(
    mergePlaylist([
      {
        id: createId(),
        type: draftType.value,
        src: trimmed,
        ...buildPlaybackFields(draftType.value),
        fallbackSrc:
          draftType.value === 'web' && draftFallbackEnabled.value
            ? (draftFallback.value ?? undefined)
            : undefined,
        fallbackName:
          draftType.value === 'web' && draftFallbackEnabled.value
            ? (draftFallbackName.value ?? undefined)
            : undefined,
        mute: draftType.value === 'video' ? draftMute.value : false
      }
    ])
  )

  resetDraft()
  return true
}

/** Applies the dialog values onto an existing playlist item. */
const editDraft = (): boolean => {
  if (!canSubmitDraft.value) {
    return false
  }

  const index = editingItemIndex.value
  if (index === null) {
    return false
  }

  const current = props.playlist[index]
  if (!current) {
    return false
  }

  if (draftSourceMode.value === 'file') {
    const asset = draftAssets.value[0]
    if (!asset) {
      return false
    }

    emitPlaylist(
      props.playlist.map((item, itemIndex) =>
        itemIndex === index
          ? {
              id: current.id,
              type: draftType.value,
              src: asset.id,
              sourceName: asset.name,
              ...buildPlaybackFields(draftType.value),
              fallbackSrc:
                draftType.value === 'web' && draftFallbackEnabled.value
                  ? (draftFallback.value ?? undefined)
                  : undefined,
              fallbackName:
                draftType.value === 'web' && draftFallbackEnabled.value
                  ? (draftFallbackName.value ?? undefined)
                  : undefined,
              mute: draftType.value === 'video' ? draftMute.value : false
            }
          : item
      )
    )

    resetDraft()
    return true
  }

  const trimmed = urlInput.value.trim()
  if (draftType.value === 'web' && !isAllowedWebUrl(trimmed)) {
    urlInputTouched.value = true
    return false
  }

  emitPlaylist(
    props.playlist.map((item, itemIndex) =>
      itemIndex === index
        ? {
            id: current.id,
            type: draftType.value,
            src: trimmed,
            sourceName: undefined,
            ...buildPlaybackFields(draftType.value),
            fallbackSrc:
              draftType.value === 'web' && draftFallbackEnabled.value
                ? (draftFallback.value ?? undefined)
                : undefined,
            fallbackName:
              draftType.value === 'web' && draftFallbackEnabled.value
                ? (draftFallbackName.value ?? undefined)
                : undefined,
            mute: draftType.value === 'video' ? draftMute.value : false
          }
        : item
    )
  )

  resetDraft()
  return true
}

/** Commits the draft from the dialog into the playlist and closes the dialog. */
const submitDraft = () => {
  const submitted = dialogMode.value === 'edit' ? editDraft() : addDraft()
  if (!submitted) {
    return
  }

  isDraftDialogVisible.value = false
}

const assetLabel = (asset: PickedAsset) => asset.name

const itemLabel = (item: PlaylistItem) =>
  item.sourceName ??
  (isDirectMediaUrl(item.src) ? titleFromPath(item.src) : 'ローカル素材')

const itemSourceLabel = (item: PlaylistItem) =>
  item.type === 'web' || isDirectMediaUrl(item.src)
    ? item.src
    : 'ローカルファイル'

const itemStateLabel = (item: PlaylistItem) => {
  const labels = [
    item.type === 'video' && item.mute ? 'ミュート' : null,
    item.type === 'web' && item.fallbackSrc
      ? `フォールバック: ${fallbackLabel(item.fallbackSrc, item.fallbackName)}`
      : null
  ].filter((label): label is string => Boolean(label))

  return labels.join(' / ')
}

const fallbackLabel = (src?: string, name?: string) =>
  src
    ? (name ?? (isDirectMediaUrl(src) ? titleFromPath(src) : 'ローカル素材'))
    : '未選択'

const moveItem = (index: number, direction: -1 | 1) => {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= props.playlist.length) {
    return
  }

  const next = [...props.playlist]
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  emitPlaylist(next)
}

const removeItem = (index: number) => {
  emitPlaylist(props.playlist.filter((_, itemIndex) => itemIndex !== index))
}
</script>

<style lang="scss">
.panel-content,
.playlist-dialog {
  .surface-note,
  .playlist-meta {
    font-size: 12.5px;
    color: var(--muted);
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .validation-error {
    margin: 0;
    color: var(--el-color-danger);
    font-size: 12.5px;
    line-height: 1.5;
  }

  .row,
  .playlist-item-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
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

    :where(.el-input, .el-input-number) {
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

  :where(.el-button) {
    margin-left: 0;
    white-space: nowrap;
  }
}

.panel-content,
.playlist-composer,
.playlist-items-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.playlist-items-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.playlist-items-copy {
  display: grid;
  gap: 4px;
}

.playlist-items-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

.playlist-empty-state {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed var(--line-strong);
  background: color-mix(in srgb, var(--panel-soft), transparent 34%);
}

.choice-group {
  --el-segmented-bg-color: color-mix(
    in srgb,
    var(--surface-strong),
    var(--panel) 18%
  );
  --el-segmented-item-selected-bg-color: var(--surface-strong);
  --el-segmented-item-selected-color: var(--ink);

  align-self: flex-start;
  max-width: 100%;
}

.choice-group .el-segmented__item-selected {
  box-shadow: inset 0 0 0 1px var(--line-strong);
}

.choice-group .el-segmented__item-selected.is-focus-visible::before {
  outline-color: var(--focus-line);
  box-shadow: 0 0 0 4px var(--focus-ring);
}

.playlist-list {
  max-height: 360px;
  overflow: auto;
  padding-right: 4px;
  gap: 16px;
}

.playlist-timeline {
  display: block;
  width: 100%;

  &.el-timeline {
    padding-left: 0;
  }

  .el-timeline-item__tail,
  .el-timeline-item__node {
    display: none;
  }

  .el-timeline-item.is-start .el-timeline-item__wrapper {
    position: static;
    top: 0;
    padding-left: 0;
  }
}

.timeline-entry {
  display: grid;
  grid-template-columns: minmax(96px, 128px) 62px minmax(0, 1fr);
  align-items: stretch;
  width: 100%;
}

.marker-track {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 34px;

  &::after {
    content: '';
    position: absolute;
    z-index: 0;
    top: 34px;
    bottom: -20px;
    width: 2px;
    background: color-mix(in srgb, var(--line-strong), var(--accent) 26%);
  }
}

.playlist-timeline .el-timeline-item:last-child .marker-track::after {
  display: none;
}

.playlist-item {
  display: grid;
  gap: 12px;
  width: 100%;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-strong), var(--panel) 16%);
}

.playlist-dialog {
  --el-dialog-padding-primary: 0;
}

.playlist-dialog-header {
  padding: 16px 18px 12px;
}

.playlist-dialog-body {
  padding: 0 18px 8px;
}

.playlist-dialog-footer {
  padding: 12px 18px 16px;
  border-top: 1px solid var(--line-subtle);
}

.playlist-dialog-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.playlist-dialog-note {
  margin: 0;
}

.playlist-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;

  :where(.el-tag) {
    flex: 0 0 auto;
  }

  strong {
    min-width: 0;
    text-wrap: balance;
  }
}

.playlist-item-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.playlist-step {
  display: grid;
  gap: 4px;
  justify-items: end;
  align-self: start;
  padding: 4px 0 20px;
  text-align: right;
}

.playlist-step-index {
  font-family: var(--font-display);
  font-size: 19px;
  line-height: 1;
  color: color-mix(in srgb, var(--ink), var(--accent) 22%);
}

.playlist-step-copy {
  font-size: 12px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.playlist-marker {
  position: relative;
  z-index: 1;
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid
    color-mix(in srgb, var(--line-strong), var(--surface-strong) 20%);
  color: var(--ink);
  background: color-mix(in srgb, var(--surface-strong), var(--panel) 24%);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--shadow), transparent 42%);

  :where(svg) {
    width: 16px;
    height: 16px;
  }

  &.is-image {
    color: color-mix(in srgb, var(--accent), var(--ink) 16%);
    background: color-mix(
      in srgb,
      var(--accent-soft),
      var(--surface-strong) 28%
    );
  }

  &.is-video {
    color: color-mix(in srgb, var(--el-color-warning-dark-2), var(--ink) 12%);
    background: color-mix(
      in srgb,
      var(--el-color-warning-light-9),
      var(--accent-warm) 24%
    );
  }

  &.is-web {
    color: color-mix(in srgb, var(--el-color-info-dark-2), var(--ink) 12%);
    background: color-mix(
      in srgb,
      var(--el-color-info-light-9),
      var(--surface-strong) 22%
    );
  }
}

.playlist-item-actions {
  justify-content: flex-end;
}
</style>

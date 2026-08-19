<template>
  <div class="panel-content" :class="{ 'is-compact': compact }">
    <section class="playlist-items-shell" aria-label="プレイリスト項目">
      <div v-if="showHeader" class="playlist-items-header">
        <div class="playlist-items-copy">
          <strong class="playlist-items-title">{{ heading }}</strong>
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

      <div
        data-testid="playlist-item-timeline"
        class="track-scroll"
        :class="{
          'is-empty': playlist.length === 0,
          'is-shuffle': shuffle
        }"
        role="region"
        tabindex="0"
        :aria-label="timelineAriaLabel"
      >
        <p v-if="playlist.length === 0" class="playlist-meta empty-message">
          {{ emptyMessage }}
        </p>

        <ol v-else class="item-track" @dragend="finishDrag">
          <li
            v-for="entry in timelineEntries"
            :key="entry.item.id"
            class="track-item"
            :class="{
              'is-dragging': draggedItemIndex === entry.index,
              'is-drop-target': dropTargetIndex === entry.index,
              'is-forever': getItemPlaybackMode(entry.item) === 'forever',
              'is-unreachable': entry.isUnreachable
            }"
            :draggable="canReorderItems"
            @dragstart="startDrag(entry.index, $event)"
            @dragenter.prevent="markDropTarget(entry.index)"
            @dragover.prevent
            @drop.prevent="dropItem(entry.index)"
          >
            <article
              class="item-card"
              :class="`type-${entry.item.type}`"
              :aria-label="timelineItemAriaLabel(entry)"
            >
              <div class="media-frame">
                <img
                  v-if="canShowMediaPreview(entry.item, 'image')"
                  :key="previewKey(entry.item)"
                  class="media-preview"
                  :src="previewSource(entry.item)"
                  alt=""
                  width="320"
                  height="180"
                  loading="lazy"
                  @error="handlePreviewError(entry.item)"
                />
                <video
                  v-else-if="canShowMediaPreview(entry.item, 'video')"
                  :key="previewKey(entry.item)"
                  class="media-preview"
                  :src="previewSource(entry.item)"
                  aria-hidden="true"
                  width="320"
                  height="180"
                  muted
                  playsinline
                  preload="metadata"
                  @error="handlePreviewError(entry.item)"
                />
                <div v-else class="preview-placeholder" aria-hidden="true">
                  <component
                    :is="itemIcon(entry.item.type)"
                    class="media-icon"
                  />
                  <span v-if="entry.item.type === 'web'" class="web-host">
                    {{ webHost(entry.item) }}
                  </span>
                </div>
                <span class="sequence-number">
                  {{ timelineIndexLabel(entry.index) }}
                </span>
                <span class="media-type">{{ itemTypeLabel(entry.item) }}</span>
                <span v-if="entry.isUnreachable" class="reachability-warning">
                  <WarningFilled aria-hidden="true" />
                  到達しません
                </span>
              </div>

              <div class="item-copy">
                <strong :title="itemLabel(entry.item)">
                  {{ itemLabel(entry.item) }}
                </strong>
                <span class="playback-chip">
                  {{ playbackMetaLabel(entry.item) }}
                </span>
                <span class="source-label" :title="itemSourceLabel(entry.item)">
                  {{ itemSourceLabel(entry.item) }}
                </span>
                <span
                  v-if="entry.item.type === 'web' && entry.item.fallbackSrc"
                  class="fallback-strip"
                  :title="itemStateLabel(entry.item)"
                >
                  fallbackあり
                </span>
              </div>

              <div class="item-actions">
                <ElButton
                  :icon="EditPen"
                  text
                  circle
                  type="info"
                  :aria-label="`${itemLabel(entry.item)}を編集`"
                  @click="openEditDialog(entry.index)"
                />
                <ElButton
                  v-if="!singleItemMode"
                  :icon="ArrowLeft"
                  text
                  circle
                  type="info"
                  :aria-label="`${itemLabel(entry.item)}を前へ移動`"
                  :disabled="entry.index === 0"
                  @click="moveItem(entry.index, -1)"
                />
                <ElButton
                  v-if="!singleItemMode"
                  :icon="ArrowRight"
                  text
                  circle
                  type="info"
                  :aria-label="`${itemLabel(entry.item)}を後ろへ移動`"
                  :disabled="entry.index === playlist.length - 1"
                  @click="moveItem(entry.index, 1)"
                />
                <ElButton
                  :icon="Delete"
                  text
                  circle
                  type="danger"
                  :aria-label="`${itemLabel(entry.item)}を削除`"
                  @click="confirmRemoveItem(entry.index)"
                />
              </div>

              <span
                v-if="getItemPlaybackMode(entry.item) === 'forever'"
                class="forever-cap"
                aria-label="この項目で再生を継続"
              >
                ∞
              </span>
            </article>
          </li>
        </ol>

        <button
          type="button"
          class="add-card"
          :class="{ 'is-drop-target': dropTargetIndex === playlist.length }"
          data-testid="playlist-item-add-card"
          @click="openDraftDialog"
          @dragenter.prevent="markDropTarget(playlist.length)"
          @dragover.prevent
          @drop.prevent="dropItem(playlist.length)"
        >
          <Plus aria-hidden="true" />
          <span>項目を追加</span>
        </button>
      </div>
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
            name="playlist-item-url"
            type="url"
            inputmode="url"
            autocomplete="off"
            size="small"
            placeholder="https://example.com/asset…"
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
            :key="draftType"
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
  ArrowLeft,
  ArrowRight,
  Check,
  Close,
  Delete,
  EditPen,
  Files,
  Monitor,
  Picture,
  Plus,
  VideoCamera,
  WarningFilled
} from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { computed, onBeforeUnmount, ref } from 'vue'
import { getFutaeApi } from '../shared/api'
import { isBundledMediaSource } from '../shared/local-assets'
import {
  getItemPlaybackMode,
  normalizePlaylistItemPlaybackMode
} from '../shared/playback'
import {
  findFixedSequenceStopIndex,
  movePlaylistItem
} from '../shared/playlist-items'
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
  isUnreachable: boolean
}

const props = withDefaults(
  defineProps<{
    playlist: PlaylistItem[]
    defaultDurationSec: number
    maxItems?: number
    allowFallback?: boolean
    showDraftDuration?: boolean
    emptyMessage?: string
    heading?: string
    showHeader?: boolean
    compact?: boolean
    shuffle?: boolean
  }>(),
  {
    allowFallback: true,
    showDraftDuration: true,
    emptyMessage: 'まだ項目がありません。ファイルや URL を追加してください。',
    heading: 'プレイリスト項目',
    showHeader: true,
    compact: false,
    shuffle: false
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
const draggedItemIndex = ref<number | null>(null)
const dropTargetIndex = ref<number | null>(null)
const previewFailures = ref<ReadonlySet<string>>(new Set())
const previewRetryCounts = ref<Readonly<Record<string, number>>>({})
const previewRetryTimers = new Set<number>()
const scheduledPreviewRetries = new Set<string>()

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
const canReorderItems = computed(
  () => !singleItemMode.value && props.playlist.length > 1
)
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

const fixedSequenceStopIndex = computed(() =>
  findFixedSequenceStopIndex(props.playlist, props.shuffle)
)

/** Decorates playlist items with ordering and reachability metadata. */
const timelineEntries = computed<PlaylistTimelineEntry[]>(() =>
  props.playlist.map((item, index) => ({
    item,
    index,
    isUnreachable:
      fixedSequenceStopIndex.value >= 0 && index > fixedSequenceStopIndex.value
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

const timelineAriaLabel = computed(() =>
  props.shuffle
    ? 'プレイリスト項目の管理順。再生順はShuffleにより毎回変わります。'
    : 'プレイリスト項目の再生順'
)

const itemTypeLabel = (item: PlaylistItem) =>
  ({ image: '画像', video: '動画', web: 'Web' })[item.type]

const timelineIndexLabel = (index: number) => String(index + 1).padStart(2, '0')

const timelineItemAriaLabel = (entry: PlaylistTimelineEntry) => {
  const position = props.shuffle
    ? `管理順${entry.index + 1}番、再生順はランダム`
    : `${entry.index + 1}番目`
  const reachability = entry.isUnreachable
    ? '、先行する無期限項目で再生が止まるため到達しません'
    : ''

  return `${position}、${itemLabel(entry.item)}${reachability}`
}

/** Resolves a media source for a non-interactive card preview. */
const previewSource = (item: PlaylistItem): string => {
  if (isBundledMediaSource(item.src)) {
    return new URL(
      item.src.replace(/^\/+/, ''),
      window.location.href
    ).toString()
  }

  return isDirectMediaUrl(item.src) ? item.src : api.assets.toUrl(item.src)
}

const previewKey = (item: PlaylistItem) =>
  `${item.id}:${previewRetryCounts.value[item.id] ?? 0}`

const canShowMediaPreview = (item: PlaylistItem, type: 'image' | 'video') =>
  item.type === type && !previewFailures.value.has(item.id)

const webHost = (item: PlaylistItem) => {
  try {
    return new URL(item.src).hostname
  } catch {
    return 'Web'
  }
}

/** Retries newly registered local assets once the debounced config save lands. */
const handlePreviewError = (item: PlaylistItem) => {
  const retryCount = previewRetryCounts.value[item.id] ?? 0
  const isLocalAsset =
    !isBundledMediaSource(item.src) && !isDirectMediaUrl(item.src)

  if (isLocalAsset && retryCount < 2 && !scheduledPreviewRetries.has(item.id)) {
    scheduledPreviewRetries.add(item.id)
    const timer = window.setTimeout(
      () => {
        previewRetryTimers.delete(timer)
        scheduledPreviewRetries.delete(item.id)
        previewRetryCounts.value = {
          ...previewRetryCounts.value,
          [item.id]: retryCount + 1
        }
      },
      240 * (retryCount + 1)
    )
    previewRetryTimers.add(timer)
    return
  }

  previewFailures.value = new Set([...previewFailures.value, item.id])
}

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
  const next = movePlaylistItem(props.playlist, index, nextIndex)

  if (next === props.playlist) {
    return
  }

  emitPlaylist(next)
}

/** Starts a pointer drag while retaining button-based keyboard reordering. */
const startDrag = (index: number, event: DragEvent) => {
  if (!canReorderItems.value) {
    event.preventDefault()
    return
  }

  draggedItemIndex.value = index
  dropTargetIndex.value = index

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

/** Marks the target slot used by the current pointer drag. */
const markDropTarget = (index: number) => {
  if (draggedItemIndex.value !== null) {
    dropTargetIndex.value = index
  }
}

/** Moves a dragged item to a concrete sequence index. */
const dropItem = (targetIndex: number) => {
  const sourceIndex = draggedItemIndex.value

  if (sourceIndex === null || sourceIndex === targetIndex) {
    finishDrag()
    return
  }

  const next = movePlaylistItem(props.playlist, sourceIndex, targetIndex)

  if (next !== props.playlist) {
    emitPlaylist(next)
  }

  finishDrag()
}

/** Clears transient drag affordances after a drop or cancellation. */
const finishDrag = () => {
  draggedItemIndex.value = null
  dropTargetIndex.value = null
}

const removeItem = (index: number) => {
  emitPlaylist(props.playlist.filter((_, itemIndex) => itemIndex !== index))
}

/** Requires an explicit confirmation before autosaved content is removed. */
const confirmRemoveItem = async (index: number) => {
  const item = props.playlist[index]
  if (!item) {
    return
  }

  try {
    await ElMessageBox.confirm(
      `「${itemLabel(item)}」をプレイリストから削除します。元に戻せません。`,
      '項目を削除',
      {
        confirmButtonText: '削除',
        cancelButtonText: 'キャンセル',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  removeItem(index)
}

onBeforeUnmount(() => {
  previewRetryTimers.forEach((timer) => window.clearTimeout(timer))
})
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

.panel-content {
  container-type: inline-size;
  min-width: 0;

  .track-scroll {
    display: flex;
    align-items: stretch;
    gap: 22px;
    min-width: 0;
    overflow-x: auto;
    overflow-y: clip;
    padding: 8px 4px 12px;
    scrollbar-gutter: stable;
    overscroll-behavior-inline: contain;

    &:focus-visible {
      outline: 2px solid var(--focus-line);
      outline-offset: 3px;
      box-shadow: 0 0 0 4px var(--focus-ring);
    }

    &::-webkit-scrollbar {
      height: 8px;
    }

    &::-webkit-scrollbar-track {
      border-radius: 999px;
      background: color-mix(in srgb, var(--panel-soft), transparent 34%);
    }

    &::-webkit-scrollbar-thumb {
      border: 2px solid transparent;
      border-radius: 999px;
      background: color-mix(in srgb, var(--muted), transparent 28%);
      background-clip: padding-box;
    }
  }

  .track-scroll.is-empty {
    align-items: center;
    min-height: 174px;
  }

  .empty-message {
    flex: 0 1 280px;
    margin: 0;
    padding: 12px 14px;
    border: 1px dashed var(--line-strong);
    border-radius: 12px;
    background: color-mix(in srgb, var(--panel-soft), transparent 34%);
  }

  .item-track {
    display: flex;
    align-items: stretch;
    gap: 22px;
    min-width: max-content;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .track-item {
    position: relative;
    flex: 0 0 184px;
    min-width: 0;
    transition:
      opacity 120ms ease,
      transform 120ms ease;

    &:not(:last-child)::after {
      content: '›';
      position: absolute;
      inset-block-start: 53px;
      inset-inline-end: -16px;
      color: color-mix(in srgb, var(--muted), transparent 18%);
      font-family: var(--font-display);
      font-size: 22px;
      line-height: 1;
    }

    &.is-dragging {
      opacity: 0.42;
      transform: scale(0.98);
    }

    &.is-drop-target .item-card {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--focus-ring);
    }

    &.is-unreachable .item-card {
      border-style: dashed;
      border-color: color-mix(
        in srgb,
        var(--el-color-warning),
        var(--line) 48%
      );
      background: color-mix(in srgb, var(--surface-strong), var(--panel) 26%);
    }
  }

  .item-card {
    position: relative;
    display: grid;
    grid-template-rows: auto 1fr auto;
    min-height: 214px;
    overflow: clip;
    border: 1px solid var(--line-strong);
    border-radius: 13px;
    background: color-mix(in srgb, var(--surface-strong), var(--panel) 10%);
    box-shadow: 0 10px 24px color-mix(in srgb, var(--shadow), transparent 58%);
  }

  .media-frame {
    position: relative;
    display: grid;
    place-items: center;
    aspect-ratio: 16 / 9;
    overflow: clip;
    border-bottom: 1px solid var(--line-subtle);
    background: color-mix(
      in srgb,
      var(--accent-soft),
      var(--surface-strong) 64%
    );
    color: color-mix(in srgb, var(--accent), var(--ink) 18%);
  }

  .media-preview,
  .preview-placeholder {
    width: 100%;
    height: 100%;
  }

  .media-preview {
    display: block;
    object-fit: cover;
  }

  .preview-placeholder {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 7px;
    padding: 12px;
  }

  .type-video .media-frame {
    background: color-mix(
      in srgb,
      var(--el-color-warning-light-9),
      var(--surface-strong) 58%
    );
    color: color-mix(in srgb, var(--el-color-warning-dark-2), var(--ink) 18%);
  }

  .type-web .media-frame {
    background: color-mix(
      in srgb,
      var(--el-color-info-light-9),
      var(--surface-strong) 56%
    );
    color: color-mix(in srgb, var(--el-color-info-dark-2), var(--ink) 16%);
  }

  .media-icon {
    width: 32px;
    height: 32px;
  }

  .web-host {
    max-width: 100%;
    overflow: hidden;
    color: var(--muted);
    font-size: 0.86rem;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sequence-number,
  .media-type {
    position: absolute;
    inset-block-start: 8px;
    display: inline-flex;
    align-items: center;
    min-height: 23px;
    padding-inline: 7px;
    border: 1px solid color-mix(in srgb, var(--line-strong), transparent 18%);
    border-radius: 7px;
    background: color-mix(in srgb, var(--surface-strong), transparent 8%);
    font-size: 0.86rem;
    font-weight: 700;
    backdrop-filter: blur(6px);
  }

  .sequence-number {
    inset-inline-start: 8px;
    font-family: var(--font-display);
    font-variant-numeric: tabular-nums;
  }

  .media-type {
    inset-inline-end: 8px;
    color: var(--muted);
  }

  .item-copy {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-content: start;
    gap: 5px 8px;
    min-width: 0;
    padding: 11px 11px 8px;

    strong {
      min-width: 0;
      overflow: clip;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      line-height: 1.35;
    }
  }

  .playback-chip {
    justify-self: end;
    color: color-mix(in srgb, var(--ink), var(--accent) 24%);
    font-family: var(--font-display);
    font-size: 0.86rem;
    line-height: 1.35;
    font-variant-numeric: tabular-nums;
  }

  .source-label {
    grid-column: 1 / -1;
    overflow: clip;
    color: var(--muted);
    font-size: 0.86rem;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fallback-strip {
    grid-column: 1 / -1;
    display: inline-flex;
    align-items: center;
    width: fit-content;
    min-height: 20px;
    padding-inline: 7px;
    border-inline-start: 3px solid var(--el-color-info);
    border-radius: 4px;
    background: color-mix(
      in srgb,
      var(--el-color-info-light-9),
      transparent 16%
    );
    color: var(--muted);
    font-size: 0.86rem;
  }

  .reachability-warning {
    position: absolute;
    inset-inline: 8px;
    inset-block-end: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 25px;
    padding-inline: 8px;
    border: 1px solid
      color-mix(in srgb, var(--el-color-warning), transparent 34%);
    border-radius: 7px;
    background: color-mix(in srgb, var(--surface-strong), transparent 6%);
    color: color-mix(in srgb, var(--el-color-warning), var(--ink) 36%);
    font-size: 0.86rem;
    font-weight: 700;
    backdrop-filter: blur(8px);

    svg {
      width: 14px;
      height: 14px;
    }
  }

  .item-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1px;
    padding: 5px 6px;
    border-top: 1px solid var(--line-subtle);

    :where(.el-button) {
      width: 32px;
      height: 32px;
    }
  }

  .forever-cap {
    position: absolute;
    inset-block-start: 47px;
    inset-inline-end: 8px;
    display: grid;
    place-items: center;
    width: 34px;
    height: 27px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--ink), transparent 8%);
    color: var(--surface-strong);
    font-family: var(--font-display);
    font-size: 21px;
    line-height: 1;
  }

  .add-card {
    appearance: none;
    flex: 0 0 132px;
    min-height: 214px;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 8px;
    border: 1px dashed var(--line-strong);
    border-radius: 13px;
    background: color-mix(in srgb, var(--surface-strong), transparent 42%);
    color: var(--muted);
    cursor: pointer;
    transition:
      border-color 120ms ease,
      color 120ms ease,
      background 120ms ease;

    svg {
      width: 24px;
      height: 24px;
    }

    span {
      font-size: 0.86rem;
      font-weight: 600;
    }

    &:hover,
    &.is-drop-target {
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent-soft), transparent 44%);
      color: var(--ink);
    }

    &:focus-visible {
      outline: 2px solid var(--focus-line);
      outline-offset: 3px;
      box-shadow: 0 0 0 4px var(--focus-ring);
    }
  }

  &.is-compact {
    gap: 0;

    .playlist-items-shell {
      gap: 0;
    }
  }
}

@container (max-width: 679px) {
  .panel-content {
    .track-item {
      flex-basis: 168px;
    }

    .item-card,
    .add-card {
      min-height: 198px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel-content {
    .track-item,
    .add-card {
      transition: none;
    }
  }
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
</style>

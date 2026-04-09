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

        <Button
          label="追加"
          icon="pi pi-plus"
          size="small"
          data-testid="playlist-item-add-button"
          @click="openDraftDialog"
        />
      </div>

      <p
        v-if="playlist.length === 0"
        class="playlist-meta playlist-empty-state"
      >
        {{ emptyMessage }}
      </p>

      <Timeline
        v-else
        :value="timelineEntries"
        data-testid="playlist-item-timeline"
        class="playlist-list playlist-timeline"
      >
        <template #opposite="slotProps">
          <div class="playlist-step">
            <span class="playlist-step-index">
              {{ timelineIndexLabel(slotProps.item.index) }}
            </span>
            <span class="playlist-step-copy">
              {{ playbackMetaLabel(slotProps.item.item) }}
            </span>
          </div>
        </template>

        <template #marker="slotProps">
          <span
            class="playlist-marker"
            :class="`is-${slotProps.item.item.type}`"
            aria-hidden="true"
          >
            <i :class="itemIcon(slotProps.item.item.type)"></i>
          </span>
        </template>

        <template #content="slotProps">
          <div class="playlist-item">
            <div class="playlist-item-header">
              <div class="playlist-item-copy">
                <strong>{{ itemLabel(slotProps.item.item) }}</strong>
                <div class="playlist-meta">
                  {{ itemSourceLabel(slotProps.item.item) }}
                </div>
                <div
                  v-if="itemStateLabel(slotProps.item.item)"
                  class="playlist-meta"
                >
                  {{ itemStateLabel(slotProps.item.item) }}
                </div>
              </div>
            </div>

            <div class="playlist-item-actions">
              <Button
                icon="pi pi-pencil"
                text
                severity="secondary"
                aria-label="項目を編集"
                @click="openEditDialog(slotProps.item.index)"
              />
              <Button
                v-if="!singleItemMode"
                icon="pi pi-arrow-up"
                text
                severity="secondary"
                aria-label="項目を上へ移動"
                :disabled="slotProps.item.index === 0"
                @click="moveItem(slotProps.item.index, -1)"
              />
              <Button
                v-if="!singleItemMode"
                icon="pi pi-arrow-down"
                text
                severity="secondary"
                aria-label="項目を下へ移動"
                :disabled="slotProps.item.index === playlist.length - 1"
                @click="moveItem(slotProps.item.index, 1)"
              />
              <Button
                icon="pi pi-trash"
                text
                severity="danger"
                aria-label="項目を削除"
                @click="removeItem(slotProps.item.index)"
              />
            </div>
          </div>
        </template>
      </Timeline>
    </section>

    <Dialog
      v-model:visible="isDraftDialogVisible"
      modal
      :header="dialogTitle"
      :style="{ width: '42rem' }"
      :breakpoints="{ '960px': '92vw' }"
      class="playlist-dialog"
    >
      <div class="playlist-composer">
        <div class="field">
          <label :id="typeLabelId">種類</label>
          <SelectButton
            :modelValue="draftType"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
            :ariaLabelledby="typeLabelId"
            size="small"
            class="choice-group"
            @update:modelValue="handleDraftTypeChange"
          />
        </div>

        <div v-if="draftType !== 'web'" class="field">
          <label :id="sourceModeLabelId">入力方法</label>
          <SelectButton
            :modelValue="draftSourceMode"
            :options="sourceModeOptions"
            optionLabel="label"
            optionValue="value"
            :allowEmpty="false"
            :ariaLabelledby="sourceModeLabelId"
            size="small"
            class="choice-group"
            @update:modelValue="handleDraftSourceModeChange"
          />
        </div>

        <div v-if="draftSourceMode === 'url'" class="field">
          <label :for="urlInputId">URL</label>
          <InputText
            :id="urlInputId"
            v-model="urlInput"
            size="small"
            placeholder="https://example.com/asset"
            class="w-full"
          />
        </div>

        <div v-else class="field-inline">
          <div class="field-copy">
            <strong>{{ fileSelectionTitle }}</strong>
            <p class="surface-note">{{ selectedAssetsLabel }}</p>
          </div>

          <div class="row">
            <Button
              label="ファイルを選択"
              icon="pi pi-images"
              size="small"
              severity="secondary"
              @click="pickDraftFiles"
            />
            <Button
              v-if="draftAssets.length > 0"
              label="クリア"
              icon="pi pi-times"
              size="small"
              severity="secondary"
              text
              @click="clearDraftFiles"
            />
          </div>
        </div>

        <div v-if="showDraftDuration" class="field">
          <label :for="urlDurationInputId">表示時間（秒）</label>
          <InputNumber
            :inputId="urlDurationInputId"
            v-model="urlDuration"
            size="small"
            :min="draftType === 'video' ? undefined : 2"
            :max="36000"
            placeholder="自動"
          />
        </div>

        <div v-if="draftType === 'video'" class="field-inline">
          <label :for="draftMuteInputId">ミュート</label>
          <ToggleSwitch
            :inputId="draftMuteInputId"
            :modelValue="draftMute"
            @update:modelValue="draftMute = Boolean($event)"
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
          <Checkbox
            v-model="draftFallbackEnabled"
            :inputId="draftFallbackEnabledId"
            binary
            @update:modelValue="handleDraftFallbackToggle"
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
            <Button
              label="画像を選択"
              icon="pi pi-image"
              size="small"
              severity="secondary"
              @click="pickDraftFallback"
            />
            <Button
              v-if="draftFallback"
              label="クリア"
              icon="pi pi-times"
              size="small"
              severity="secondary"
              text
              @click="clearDraftFallback"
            />
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
          <Button
            label="キャンセル"
            severity="secondary"
            text
            @click="closeDraftDialog"
          />
          <Button
            :label="dialogSubmitLabel"
            icon="pi pi-check"
            :disabled="!canSubmitDraft"
            @click="submitDraft"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Timeline from 'primevue/timeline'
import { getFutaeApi } from '../shared/api'
import type { AssetType, PickedAsset, PlaylistItem } from '../shared/types'
import { createId, titleFromPath } from '../shared/utils'

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
const sourceModeLabelId = createId()

const urlInput = ref('')
const draftType = ref<AssetType>('image')
const draftSourceMode = ref<DraftSourceMode>('file')
const urlDuration = ref<number | null>(null)
const draftAssets = ref<PickedAsset[]>([])
const draftFallback = ref<string | null>(null)
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
  fallbackLabel(draftFallback.value ?? undefined)
)
const canSubmitDraft = computed(() =>
  draftSourceMode.value === 'url'
    ? urlInput.value.trim().length > 0
    : draftAssets.value.length > 0
)

const itemIcon = (type: AssetType) =>
  ({ image: 'pi pi-image', video: 'pi pi-video', web: 'pi pi-globe' })[type]

const timelineIndexLabel = (index: number) => String(index + 1).padStart(2, '0')

const playbackMetaLabel = (item: PlaylistItem) => {
  if (typeof item.durationSec === 'number') {
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

  dialogMode.value = 'edit'
  editingItemIndex.value = index
  draftType.value = item.type
  urlDuration.value = item.durationSec ?? null
  draftFallback.value = item.fallbackSrc ?? null
  draftFallbackEnabled.value = Boolean(item.fallbackSrc)
  draftMute.value = item.mute ?? false

  if (item.type === 'web') {
    draftSourceMode.value = 'url'
    urlInput.value = item.src
    draftAssets.value = []
  } else if (item.originUrl || item.src.startsWith('http')) {
    draftSourceMode.value = 'url'
    urlInput.value = item.originUrl ?? item.src
    draftAssets.value = []
  } else {
    draftSourceMode.value = 'file'
    urlInput.value = ''
    draftAssets.value = [
      {
        path: item.src,
        type: item.type,
        name: titleFromPath(item.src)
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

const normalizeDuration = (
  type: AssetType,
  value: number | null | undefined
): number | undefined => {
  if (type === 'video' && (value === null || value === undefined)) {
    return undefined
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  return type === 'video' ? undefined : props.defaultDurationSec
}

const buildItem = (asset: PickedAsset): PlaylistItem => ({
  id: createId(),
  type: asset.type,
  src: asset.path,
  durationSec: normalizeDuration(asset.type, urlDuration.value),
  mute: asset.type === 'video' ? draftMute.value : false
})

const resetDraft = () => {
  urlInput.value = ''
  urlDuration.value = null
  draftAssets.value = []
  draftFallback.value = null
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
  }
}

const pickDraftFallback = async () => {
  const assets = await api.assets.pickFiles({ kind: 'image' })
  const asset = assets[0]
  if (!asset) {
    return
  }

  draftFallbackEnabled.value = true
  draftFallback.value = asset.path
}

const clearDraftFallback = () => {
  draftFallback.value = null
}

const addDraft = async (): Promise<boolean> => {
  if (!canSubmitDraft.value) {
    return false
  }

  if (draftSourceMode.value === 'file') {
    emitPlaylist(mergePlaylist(draftAssets.value.map(buildItem)))
    resetDraft()
    return true
  }

  const trimmed = urlInput.value.trim()
  let src = trimmed
  let originUrl: string | undefined

  if (draftType.value !== 'web' && trimmed.startsWith('http')) {
    const cached = await api.assets.cacheRemote(trimmed, draftType.value)
    if (cached) {
      src = cached.localPath
      originUrl = cached.originalUrl
    }
  }

  emitPlaylist(
    mergePlaylist([
      {
        id: createId(),
        type: draftType.value,
        src,
        originUrl,
        durationSec: normalizeDuration(draftType.value, urlDuration.value),
        fallbackSrc:
          draftType.value === 'web' && draftFallbackEnabled.value
            ? (draftFallback.value ?? undefined)
            : undefined,
        mute: draftType.value === 'video' ? draftMute.value : false
      }
    ])
  )

  resetDraft()
  return true
}

/** Applies the dialog values onto an existing playlist item. */
const editDraft = async (): Promise<boolean> => {
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
              src: asset.path,
              durationSec: normalizeDuration(
                draftType.value,
                urlDuration.value
              ),
              fallbackSrc:
                draftType.value === 'web' && draftFallbackEnabled.value
                  ? (draftFallback.value ?? undefined)
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
  let src = trimmed
  let originUrl: string | undefined

  if (draftType.value !== 'web' && trimmed.startsWith('http')) {
    const cached = await api.assets.cacheRemote(trimmed, draftType.value)
    if (cached) {
      src = cached.localPath
      originUrl = cached.originalUrl
    }
  }

  emitPlaylist(
    props.playlist.map((item, itemIndex) =>
      itemIndex === index
        ? {
            id: current.id,
            type: draftType.value,
            src,
            originUrl,
            durationSec: normalizeDuration(draftType.value, urlDuration.value),
            fallbackSrc:
              draftType.value === 'web' && draftFallbackEnabled.value
                ? (draftFallback.value ?? undefined)
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
const submitDraft = async () => {
  const submitted =
    dialogMode.value === 'edit' ? await editDraft() : await addDraft()
  if (!submitted) {
    return
  }

  isDraftDialogVisible.value = false
}

const assetLabel = (asset: PickedAsset) =>
  asset.name ?? titleFromPath(asset.path)

const itemLabel = (item: PlaylistItem) =>
  titleFromPath(item.originUrl ?? item.src)

const itemSourceLabel = (item: PlaylistItem) =>
  item.originUrl ? `キャッシュ元: ${item.originUrl}` : item.src

const itemStateLabel = (item: PlaylistItem) => {
  const labels = [
    item.type === 'video' && item.mute ? 'ミュート' : null,
    item.type === 'web' && item.fallbackSrc
      ? `フォールバック: ${fallbackLabel(item.fallbackSrc)}`
      : null
  ].filter((label): label is string => Boolean(label))

  return labels.join(' / ')
}

const fallbackLabel = (src?: string) => (src ? titleFromPath(src) : '未選択')

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

  :where(.p-button) {
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
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  &:where(.p-selectbutton) {
    gap: 0;
    align-self: flex-start;
  }
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

  .p-timeline-event {
    width: 100%;
    align-items: flex-start;
  }

  .p-timeline-event-opposite {
    --p-timeline-vertical-event-content-padding: 0 4px;

    flex: 0 0 auto;
    min-width: 0;
    padding: 4px 0 20px;
  }

  .p-timeline-event-separator {
    flex: 0 0 48px;
    margin: 0 14px 0 0;
  }

  .p-timeline-event-marker {
    width: auto;
    height: auto;
    background: transparent;
    border: 0;
    box-shadow: none;
  }

  .p-timeline-event-connector {
    width: 2px;
    background: color-mix(in srgb, var(--line-strong), var(--accent) 26%);
  }

  .p-timeline-event-content {
    --p-timeline-vertical-event-content-padding: 0;

    flex: 1 1 auto;
    min-width: 0;
  }
}

.playlist-item {
  display: grid;
  gap: 12px;
  width: 100%;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-strong), var(--panel) 16%);
}

.playlist-dialog {
  :where(.p-dialog-header) {
    padding: 16px 18px 12px;
  }

  :where(.p-dialog-content) {
    padding: 0 18px 8px;
  }

  :where(.p-dialog-footer) {
    padding: 12px 18px 16px;
    border-top: 1px solid var(--line-subtle);
  }
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
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--line-strong), white 20%);
  color: var(--ink);
  background: color-mix(in srgb, var(--surface-strong), var(--panel) 24%);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--shadow), transparent 42%);

  &.is-image {
    color: color-mix(in srgb, var(--accent), var(--ink) 16%);
    background: color-mix(in srgb, var(--accent-soft), white 28%);
  }

  &.is-video {
    color: color-mix(in srgb, var(--p-orange-700), var(--ink) 12%);
    background: color-mix(in srgb, var(--accent-warm), white 32%);
  }

  &.is-web {
    color: color-mix(in srgb, var(--p-sky-700), var(--ink) 12%);
    background: color-mix(in srgb, var(--p-sky-100), white 22%);
  }
}

.playlist-item-actions {
  justify-content: flex-end;
}
</style>

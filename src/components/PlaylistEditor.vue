<template>
  <div class="panel-content">
    <section class="playlist-items-shell">
      <div class="playlist-items-header">
        <div class="playlist-items-copy">
          <strong class="playlist-items-title">プレイリスト項目</strong>
          <p class="playlist-meta">
            {{ playlist.length }} 件を表示しています。
            <span v-if="singleItemMode">
              追加すると現在の項目を置き換えます。
            </span>
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

      <div v-else class="playlist-list">
        <div
          v-for="(item, index) in playlist"
          :key="item.id"
          class="playlist-item"
        >
          <div class="playlist-item-header">
            <strong>{{ itemLabel(item) }}</strong>
            <Tag :value="itemTypeLabel(item.type)" />
          </div>

          <div class="playlist-meta">
            {{ item.originUrl ? 'キャッシュ元: ' + item.originUrl : item.src }}
          </div>

          <div v-if="showItemSettings" class="playlist-fields">
            <div class="field-grid field-grid-2">
              <div class="field">
                <label :for="`playlist-duration-${item.id}`"
                  >表示時間（秒）</label
                >
                <InputNumber
                  :inputId="`playlist-duration-${item.id}`"
                  :modelValue="item.durationSec ?? null"
                  :min="item.type === 'video' ? undefined : 2"
                  :max="36000"
                  placeholder="自動"
                  @update:modelValue="
                    updateItem(index, {
                      durationSec: normalizeDuration(item.type, $event)
                    })
                  "
                />
              </div>

              <div v-if="item.type === 'video'" class="field-inline">
                <label :for="`playlist-mute-${item.id}`">ミュート</label>
                <ToggleSwitch
                  :inputId="`playlist-mute-${item.id}`"
                  :modelValue="item.mute ?? false"
                  @update:modelValue="
                    updateItem(index, { mute: Boolean($event) })
                  "
                />
              </div>
            </div>

            <template v-if="allowFallback && item.type === 'web'">
              <div class="field-inline field-inline-toggle">
                <div class="field-copy">
                  <label :for="`playlist-fallback-enabled-${item.id}`"
                    >待機・失敗時の表示</label
                  >
                  <p class="surface-note">
                    Web の読込待機中または失敗時だけ、代わりの画像を表示します。
                  </p>
                </div>
                <Checkbox
                  :inputId="`playlist-fallback-enabled-${item.id}`"
                  :modelValue="isFallbackEnabled(item.id)"
                  binary
                  @update:modelValue="
                    toggleItemFallback(index, item.id, Boolean($event))
                  "
                />
              </div>

              <div v-if="isFallbackEnabled(item.id)" class="field-inline">
                <div class="field-copy">
                  <strong>フォールバック画像</strong>
                  <p class="surface-note">
                    {{ fallbackLabel(item.fallbackSrc) }}
                  </p>
                </div>

                <div class="row">
                  <Button
                    label="画像を選択"
                    icon="pi pi-image"
                    severity="secondary"
                    @click="pickItemFallback(index, item.id)"
                  />
                  <Button
                    v-if="item.fallbackSrc"
                    label="クリア"
                    icon="pi pi-times"
                    severity="secondary"
                    text
                    @click="clearItemFallback(index, item.id)"
                  />
                </div>
              </div>
            </template>
          </div>

          <div class="playlist-item-actions">
            <Button
              v-if="!singleItemMode"
              icon="pi pi-arrow-up"
              text
              severity="secondary"
              aria-label="項目を上へ移動"
              :disabled="index === 0"
              @click="moveItem(index, -1)"
            />
            <Button
              v-if="!singleItemMode"
              icon="pi pi-arrow-down"
              text
              severity="secondary"
              aria-label="項目を下へ移動"
              :disabled="index === playlist.length - 1"
              @click="moveItem(index, 1)"
            />
            <Button
              icon="pi pi-trash"
              text
              severity="danger"
              aria-label="項目を削除"
              @click="removeItem(index)"
            />
          </div>
        </div>
      </div>
    </section>

    <Dialog
      v-model:visible="isDraftDialogVisible"
      modal
      header="プレイリスト項目を追加"
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
              severity="secondary"
              @click="pickDraftFiles"
            />
            <Button
              v-if="draftAssets.length > 0"
              label="クリア"
              icon="pi pi-times"
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
            :min="draftType === 'video' ? undefined : 2"
            :max="36000"
            placeholder="自動"
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
              severity="secondary"
              @click="pickDraftFallback"
            />
            <Button
              v-if="draftFallback"
              label="クリア"
              icon="pi pi-times"
              severity="secondary"
              text
              @click="clearDraftFallback"
            />
          </div>
        </div>

        <p v-if="singleItemMode" class="surface-note playlist-dialog-note">
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
            label="決定"
            icon="pi pi-check"
            :disabled="!canAddDraft"
            @click="submitDraft"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getFutaeApi } from '../shared/api'
import type { AssetType, PickedAsset, PlaylistItem } from '../shared/types'
import { createId, titleFromPath } from '../shared/utils'

type DraftSourceMode = 'file' | 'url'

const props = withDefaults(
  defineProps<{
    playlist: PlaylistItem[]
    defaultDurationSec: number
    maxItems?: number
    allowFallback?: boolean
    showDraftDuration?: boolean
    showItemSettings?: boolean
    emptyMessage?: string
  }>(),
  {
    allowFallback: true,
    showDraftDuration: true,
    showItemSettings: true,
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
const typeLabelId = createId()
const sourceModeLabelId = createId()

const urlInput = ref('')
const draftType = ref<AssetType>('image')
const draftSourceMode = ref<DraftSourceMode>('file')
const urlDuration = ref<number | null>(null)
const draftAssets = ref<PickedAsset[]>([])
const draftFallback = ref<string | null>(null)
const draftFallbackEnabled = ref(false)
const fallbackVisibility = ref<Record<string, boolean>>({})
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
const fileSelectionTitle = computed(() =>
  singleItemMode.value ? '選択中のメディア' : '追加するファイル'
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
const draftFallbackLabel = computed(() =>
  fallbackLabel(draftFallback.value ?? undefined)
)
const canAddDraft = computed(() =>
  draftSourceMode.value === 'url'
    ? urlInput.value.trim().length > 0
    : draftAssets.value.length > 0
)

const itemTypeLabel = (type: AssetType) =>
  ({ image: '画像', video: '動画', web: 'ウェブ' })[type]

watch(
  () => props.playlist,
  (playlist) => {
    fallbackVisibility.value = Object.fromEntries(
      playlist.map((item) => [
        item.id,
        fallbackVisibility.value[item.id] ?? Boolean(item.fallbackSrc)
      ])
    )
  },
  { immediate: true, deep: true }
)

const emitPlaylist = (next: PlaylistItem[]) => {
  emit('update:playlist', next)
  emit('changed')
}

/** Opens the add-item dialog with a clean draft state. */
const openDraftDialog = () => {
  resetDraft()
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
  mute: false
})

const resetDraft = () => {
  urlInput.value = ''
  urlDuration.value = null
  draftAssets.value = []
  draftFallback.value = null
  draftFallbackEnabled.value = false
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
  draftAssets.value = singleItemMode.value ? assets.slice(0, 1) : assets
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
  if (!canAddDraft.value) {
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
        mute: false
      }
    ])
  )

  resetDraft()
  return true
}

/** Commits the draft from the dialog into the playlist and closes the dialog. */
const submitDraft = async () => {
  const added = await addDraft()
  if (!added) {
    return
  }

  isDraftDialogVisible.value = false
}

const updateItem = (index: number, patch: Partial<PlaylistItem>) => {
  const next = props.playlist.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...patch } : item
  )
  emitPlaylist(next)
}

const isFallbackEnabled = (itemId: string) =>
  fallbackVisibility.value[itemId] ?? false

const toggleItemFallback = (
  index: number,
  itemId: string,
  enabled: boolean
) => {
  fallbackVisibility.value = {
    ...fallbackVisibility.value,
    [itemId]: enabled
  }

  if (!enabled) {
    updateItem(index, { fallbackSrc: undefined })
  }
}

const pickItemFallback = async (index: number, itemId: string) => {
  const assets = await api.assets.pickFiles({ kind: 'image' })
  const asset = assets[0]
  if (!asset) {
    return
  }

  fallbackVisibility.value = {
    ...fallbackVisibility.value,
    [itemId]: true
  }
  updateItem(index, { fallbackSrc: asset.path })
}

const clearItemFallback = (index: number, itemId: string) => {
  fallbackVisibility.value = {
    ...fallbackVisibility.value,
    [itemId]: false
  }
  updateItem(index, { fallbackSrc: undefined })
}

const assetLabel = (asset: PickedAsset) =>
  asset.name ?? titleFromPath(asset.path)

const itemLabel = (item: PlaylistItem) =>
  titleFromPath(item.originUrl ?? item.src)

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

  :where(.p-button) {
    white-space: nowrap;
    min-height: 34px;

    &.p-button-text {
      min-height: 30px;
    }
  }
}

.panel-content,
.playlist-composer,
.playlist-items-shell,
.playlist-fields {
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
  display: grid;
  gap: 10px;
  max-height: 360px;
  overflow: auto;
  padding-right: 4px;
}

.playlist-item {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--line-strong);
  background: var(--panel-soft-strong);
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
  align-items: center;
  gap: 12px;

  strong {
    min-width: 0;
    text-wrap: balance;
  }
}
</style>

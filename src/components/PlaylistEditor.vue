<template>
  <div class="panel-content">
    <div class="row">
      <Button
        label="Add Files"
        icon="pi pi-images"
        severity="secondary"
        @click="addFiles"
      />
      <Button
        label="Add Folder"
        icon="pi pi-folder-open"
        severity="secondary"
        @click="addFolder"
      />
    </div>

    <Divider />

    <div class="field">
      <label :for="urlInputId">URL</label>
      <InputText
        :id="urlInputId"
        v-model="urlInput"
        placeholder="https://example.com/asset"
        class="w-full"
      />
    </div>

    <div class="field-grid field-grid-2">
      <div class="field">
        <label :for="urlTypeInputId">Type</label>
        <Select
          :inputId="urlTypeInputId"
          v-model="urlType"
          :options="typeOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>

      <div class="field">
        <label :for="urlDurationInputId">Duration (sec)</label>
        <InputNumber
          :inputId="urlDurationInputId"
          v-model="urlDuration"
          :min="2"
          :max="36000"
          placeholder="auto"
        />
      </div>
    </div>

    <div class="field-inline">
      <div class="field-copy">
        <strong>Fallback Image</strong>
        <p class="surface-note">{{ fallbackLabel }}</p>
      </div>
      <Button
        label="Pick Fallback"
        icon="pi pi-image"
        severity="secondary"
        @click="pickFallback"
      />
    </div>

    <Button label="Add URL" icon="pi pi-plus" @click="addUrl" />

    <Divider />

    <p v-if="playlist.length === 0" class="playlist-meta">
      No items yet. Add assets to begin.
    </p>

    <div v-else class="playlist-list">
      <div
        v-for="(item, index) in playlist"
        :key="item.id"
        class="playlist-item"
      >
        <div class="playlist-item-header">
          <strong>{{ item.title }}</strong>
          <Tag :value="item.type.toUpperCase()" />
        </div>

        <div class="playlist-meta">
          {{ item.originUrl ? 'cached: ' + item.originUrl : item.src }}
        </div>

        <div class="playlist-fields">
          <div class="field">
            <label :for="`playlist-title-${item.id}`">Title</label>
            <InputText
              :id="`playlist-title-${item.id}`"
              :modelValue="item.title"
              class="w-full"
              @update:modelValue="updateItem(index, { title: String($event) })"
            />
          </div>

          <div class="field-grid field-grid-2">
            <div class="field">
              <label :for="`playlist-duration-${item.id}`">Duration (sec)</label>
              <InputNumber
                :inputId="`playlist-duration-${item.id}`"
                :modelValue="item.durationSec ?? null"
                :min="item.type === 'video' ? undefined : 2"
                :max="36000"
                placeholder="auto"
                @update:modelValue="
                  updateItem(index, {
                    durationSec: normalizeDuration(item.type, $event)
                  })
                "
              />
            </div>

            <div v-if="item.type === 'video'" class="field-inline">
              <label :for="`playlist-mute-${item.id}`">Mute</label>
              <ToggleSwitch
                :inputId="`playlist-mute-${item.id}`"
                :modelValue="item.mute ?? false"
                @update:modelValue="
                  updateItem(index, { mute: Boolean($event) })
                "
              />
            </div>
          </div>
        </div>

        <div class="playlist-item-actions">
          <Button
            icon="pi pi-arrow-up"
            text
            severity="secondary"
            aria-label="Move item up"
            :disabled="index === 0"
            @click="moveItem(index, -1)"
          />
          <Button
            icon="pi pi-arrow-down"
            text
            severity="secondary"
            aria-label="Move item down"
            :disabled="index === playlist.length - 1"
            @click="moveItem(index, 1)"
          />
          <Button
            icon="pi pi-trash"
            text
            severity="danger"
            aria-label="Remove item"
            @click="removeItem(index)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getFutaeApi } from '../shared/api'
import type { AssetType, PickedAsset, PlaylistItem } from '../shared/types'
import { createId, titleFromPath } from '../shared/utils'

const props = defineProps<{
  playlist: PlaylistItem[]
  defaultDurationSec: number
}>()

const emit = defineEmits<{
  'update:playlist': [PlaylistItem[]]
  changed: []
}>()

const api = getFutaeApi()

const urlInputId = createId()
const urlTypeInputId = createId()
const urlDurationInputId = createId()

const urlInput = ref('')
const urlType = ref<AssetType>('image')
const urlDuration = ref<number | null>(null)
const urlFallback = ref<string | null>(null)

const typeOptions = [
  { label: 'Image', value: 'image' },
  { label: 'Video', value: 'video' },
  { label: 'Web', value: 'web' }
]

const fallbackLabel = computed(() =>
  urlFallback.value ? titleFromPath(urlFallback.value) : 'No fallback selected'
)

const emitPlaylist = (next: PlaylistItem[]) => {
  emit('update:playlist', next)
  emit('changed')
}

const buildItem = (asset: PickedAsset): PlaylistItem => ({
  id: createId(),
  type: asset.type,
  title: titleFromPath(asset.path),
  src: asset.path,
  durationSec: asset.type === 'video' ? undefined : props.defaultDurationSec,
  mute: false
})

const addPickedAssets = (assets: PickedAsset[]) => {
  if (assets.length === 0) {
    return
  }

  emitPlaylist([...props.playlist, ...assets.map(buildItem)])
}

const addFiles = async () => {
  addPickedAssets(await api.assets.pickFiles({ kind: 'media' }))
}

const addFolder = async () => {
  addPickedAssets(await api.assets.pickFolder())
}

const pickFallback = async () => {
  const assets = await api.assets.pickFiles({ kind: 'image' })
  urlFallback.value = assets[0]?.path ?? null
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

const addUrl = async () => {
  const trimmed = urlInput.value.trim()
  if (!trimmed) {
    return
  }

  let src = trimmed
  let originUrl: string | undefined

  if (urlType.value !== 'web' && trimmed.startsWith('http')) {
    const cached = await api.assets.cacheRemote(trimmed, urlType.value)
    if (cached) {
      src = cached.localPath
      originUrl = cached.originalUrl
    }
  }

  emitPlaylist([
    ...props.playlist,
    {
      id: createId(),
      type: urlType.value,
      title: trimmed,
      src,
      originUrl,
      durationSec: normalizeDuration(urlType.value, urlDuration.value),
      fallbackSrc:
        urlType.value === 'web' ? (urlFallback.value ?? undefined) : undefined,
      mute: false
    }
  ])

  urlInput.value = ''
  urlDuration.value = null
  urlFallback.value = null
}

const updateItem = (index: number, patch: Partial<PlaylistItem>) => {
  const next = props.playlist.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...patch } : item
  )
  emitPlaylist(next)
}

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

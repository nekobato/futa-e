<template>
  <div class="panel-content">
    <div class="row">
      <label>Title</label>
      <InputText
        :modelValue="overlay.title"
        class="w-full"
        @update:modelValue="updateOverlay({ title: String($event) })"
      />
    </div>

    <div class="row">
      <label>Message</label>
      <InputText
        :modelValue="overlay.message"
        class="w-full"
        @update:modelValue="updateOverlay({ message: String($event) })"
      />
    </div>

    <div class="row">
      <Button
        label="Pick Overlay Image"
        icon="pi pi-image"
        severity="secondary"
        @click="pickImage"
      />
      <Button
        label="Clear"
        icon="pi pi-times"
        severity="secondary"
        text
        @click="clearImage"
      />
    </div>

    <div class="playlist-meta">
      {{
        overlay.imageSrc ? titleFromPath(overlay.imageSrc) : 'No overlay image'
      }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { getFutaeApi } from '../shared/api'
import type { OverlayConfig } from '../shared/types'
import { titleFromPath } from '../shared/utils'

const props = defineProps<{
  overlay: OverlayConfig
}>()

const emit = defineEmits<{
  'update:overlay': [OverlayConfig]
  changed: []
}>()

const api = getFutaeApi()

const updateOverlay = (patch: Partial<OverlayConfig>) => {
  emit('update:overlay', {
    ...props.overlay,
    ...patch
  })
  emit('changed')
}

const pickImage = async () => {
  const assets = await api.assets.pickFiles({ kind: 'image' })
  const imageSrc = assets[0]?.path
  if (!imageSrc) {
    return
  }

  updateOverlay({ imageSrc })
}

const clearImage = () => {
  updateOverlay({ imageSrc: undefined })
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { animation } from '../animations/flowField'

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
let cleanup: (() => void) | null = null

/** Mounts the flow-field animation after the canvas exists in the DOM. */
onMounted(() => {
  if (!canvasRef.value) {
    return
  }

  cleanup = animation.initialize(canvasRef.value)
})

/** Stops the animation loop and removes DOM listeners owned by the animation. */
onBeforeUnmount(() => {
  cleanup?.()
  cleanup = null
})
</script>

<template>
  <BackgroundFrame :background="animation.background">
    <canvas ref="canvas" class="background-canvas" />
  </BackgroundFrame>
</template>

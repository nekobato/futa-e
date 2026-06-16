/**
 * Particle wave surface animation for Futa-e backgrounds.
 */

import type { BackgroundAnimation } from './types'
import { TAU, initializeCanvasAnimation, type CanvasViewport } from './shared'

type WavePoint = {
  baseX: number
  baseY: number
  row: number
  column: number
  phase: number
  depth: number
}

type ParticleWavesScene = {
  points: WavePoint[]
  columns: number
  rows: number
}

/**
 * Creates a grid of particle wave points.
 */
const createScene = (viewport: CanvasViewport): ParticleWavesScene => {
  const spacing = Math.max(24, Math.min(38, viewport.width / 34))
  const columns = Math.ceil(viewport.width / spacing) + 4
  const rows = Math.ceil(viewport.height / spacing) + 4
  const points = Array.from({ length: columns * rows }, (_, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)

    return {
      baseX: (column - 2) * spacing,
      baseY: (row - 2) * spacing,
      row,
      column,
      phase: (column * 0.37 + row * 0.51) % TAU,
      depth: row / rows
    }
  })

  return { points, columns, rows }
}

/**
 * Computes the current y offset for a wave point.
 */
const getWaveOffset = (point: WavePoint, elapsedSeconds: number): number =>
  Math.sin(elapsedSeconds * 1.1 + point.phase) * 12 +
  Math.sin(elapsedSeconds * 0.62 + point.column * 0.21 + point.row * 0.28) * 18

/**
 * Paints one wave grid frame.
 */
const renderScene = ({
  scene,
  viewport,
  context,
  elapsedSeconds
}: {
  scene: ParticleWavesScene
  viewport: CanvasViewport
  context: CanvasRenderingContext2D
  elapsedSeconds: number
}): void => {
  context.clearRect(0, 0, viewport.width, viewport.height)
  context.save()
  context.globalCompositeOperation = 'screen'

  scene.points.forEach((point) => {
    const y = point.baseY + getWaveOffset(point, elapsedSeconds)
    const x = point.baseX + Math.sin(elapsedSeconds * 0.35 + point.row * 0.17) * 7
    const perspective = 0.45 + point.depth * 0.85
    const alpha = Math.max(0.08, 0.44 - point.depth * 0.18)
    const radius = perspective * (1.1 + Math.sin(elapsedSeconds + point.phase) * 0.22)

    context.fillStyle = `rgba(188, 231, 255, ${alpha})`
    context.beginPath()
    context.arc(x, y, radius, 0, TAU)
    context.fill()
  })

  context.restore()
}

export const animation: BackgroundAnimation = {
  id: 'particle-waves',
  weight: 1,
  background:
    'radial-gradient(circle at 50% 16%, rgba(50, 94, 127, 0.46), transparent 42%), linear-gradient(180deg, rgb(5, 14, 24), rgb(10, 16, 24))',
  initialize: (canvas) =>
    initializeCanvasAnimation(canvas, {
      createScene,
      renderScene
    })
}

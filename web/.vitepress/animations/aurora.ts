/**
 * Aurora curtain animation for Futa-e full-screen backgrounds.
 */

import type { BackgroundAnimation } from './types'
import { TAU, initializeCanvasAnimation, randomBetween, type CanvasViewport } from './shared'

type AuroraRibbon = {
  baseY: number
  amplitude: number
  thickness: number
  phase: number
  speed: number
  hue: number
  alpha: number
}

type AuroraScene = {
  ribbons: AuroraRibbon[]
}

/**
 * Creates a ribbon set scaled to the current viewport.
 */
const createScene = (viewport: CanvasViewport): AuroraScene => ({
  ribbons: Array.from({ length: 5 }, (_, index) => ({
    baseY: viewport.height * (0.2 + index * 0.1),
    amplitude: randomBetween(viewport.height * 0.06, viewport.height * 0.16),
    thickness: randomBetween(viewport.height * 0.1, viewport.height * 0.22),
    phase: randomBetween(0, TAU),
    speed: randomBetween(0.08, 0.18),
    hue: randomBetween(150, 215),
    alpha: randomBetween(0.12, 0.24)
  }))
})

/**
 * Draws one translucent aurora ribbon.
 */
const drawRibbon = (
  context: CanvasRenderingContext2D,
  viewport: CanvasViewport,
  ribbon: AuroraRibbon,
  elapsedSeconds: number
): void => {
  const segments = 28
  const topPoints = []
  const bottomPoints = []

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments
    const x = progress * viewport.width
    const wave =
      Math.sin(progress * TAU * 1.4 + ribbon.phase + elapsedSeconds * ribbon.speed) * ribbon.amplitude +
      Math.sin(progress * TAU * 3.1 + ribbon.phase * 0.7 + elapsedSeconds * ribbon.speed * 1.6) *
        ribbon.amplitude *
        0.34
    const y = ribbon.baseY + wave
    topPoints.push({ x, y: y - ribbon.thickness * 0.42 })
    bottomPoints.push({ x, y: y + ribbon.thickness * 0.58 })
  }

  const gradient = context.createLinearGradient(0, ribbon.baseY - ribbon.thickness, 0, ribbon.baseY + ribbon.thickness)
  gradient.addColorStop(0, `hsla(${ribbon.hue}, 90%, 68%, 0)`)
  gradient.addColorStop(0.45, `hsla(${ribbon.hue}, 92%, 64%, ${ribbon.alpha})`)
  gradient.addColorStop(1, `hsla(${ribbon.hue + 32}, 86%, 58%, 0)`)

  context.beginPath()
  topPoints.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y)
      return
    }
    context.lineTo(point.x, point.y)
  })
  bottomPoints.reverse().forEach((point) => context.lineTo(point.x, point.y))
  context.closePath()
  context.fillStyle = gradient
  context.fill()
}

/**
 * Paints the aurora scene for one frame.
 */
const renderScene = ({
  scene,
  viewport,
  context,
  elapsedSeconds
}: {
  scene: AuroraScene
  viewport: CanvasViewport
  context: CanvasRenderingContext2D
  elapsedSeconds: number
}): void => {
  context.clearRect(0, 0, viewport.width, viewport.height)
  context.save()
  context.globalCompositeOperation = 'screen'
  context.filter = 'blur(10px)'
  scene.ribbons.forEach((ribbon) => drawRibbon(context, viewport, ribbon, elapsedSeconds))
  context.restore()
}

export const animation: BackgroundAnimation = {
  id: 'aurora',
  weight: 1,
  background:
    'linear-gradient(180deg, rgb(7, 18, 35) 0%, rgb(10, 29, 39) 48%, rgb(4, 8, 18) 100%)',
  initialize: (canvas) =>
    initializeCanvasAnimation(canvas, {
      createScene,
      renderScene
    })
}

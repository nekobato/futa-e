/**
 * Firefly particle animation for quiet night backgrounds.
 */

import type { BackgroundAnimation } from './types'
import { TAU, initializeCanvasAnimation, randomBetween, type CanvasViewport } from './shared'

type Firefly = {
  x: number
  y: number
  velocityX: number
  velocityY: number
  radius: number
  phase: number
  pulseSpeed: number
  hue: number
}

type FirefliesScene = {
  fireflies: Firefly[]
}

/**
 * Creates a softly moving firefly field.
 */
const createScene = (viewport: CanvasViewport): FirefliesScene => {
  const count = Math.round(Math.min(70, Math.max(20, (viewport.width + viewport.height) / 42)))

  return {
    fireflies: Array.from({ length: count }, () => ({
      x: randomBetween(0, viewport.width),
      y: randomBetween(0, viewport.height),
      velocityX: randomBetween(-16, 16),
      velocityY: randomBetween(-10, 10),
      radius: randomBetween(1.2, 3.8),
      phase: randomBetween(0, TAU),
      pulseSpeed: randomBetween(0.9, 1.8),
      hue: randomBetween(48, 82)
    }))
  }
}

/**
 * Moves a firefly and bounces it softly at the viewport edges.
 */
const updateFirefly = (firefly: Firefly, deltaSeconds: number, viewport: CanvasViewport): void => {
  firefly.x += firefly.velocityX * deltaSeconds
  firefly.y += firefly.velocityY * deltaSeconds

  if (firefly.x < -24 || firefly.x > viewport.width + 24) {
    firefly.velocityX *= -1
  }
  if (firefly.y < -24 || firefly.y > viewport.height + 24) {
    firefly.velocityY *= -1
  }
}

/**
 * Draws one pulsing firefly glow.
 */
const drawFirefly = (
  context: CanvasRenderingContext2D,
  firefly: Firefly,
  elapsedSeconds: number
): void => {
  const pulse = 0.45 + Math.sin(elapsedSeconds * firefly.pulseSpeed + firefly.phase) * 0.35 + 0.2
  const glowRadius = firefly.radius * (6 + pulse * 7)
  const gradient = context.createRadialGradient(firefly.x, firefly.y, 0, firefly.x, firefly.y, glowRadius)

  gradient.addColorStop(0, `hsla(${firefly.hue}, 95%, 72%, ${0.46 * pulse})`)
  gradient.addColorStop(0.3, `hsla(${firefly.hue}, 88%, 62%, ${0.2 * pulse})`)
  gradient.addColorStop(1, `hsla(${firefly.hue}, 80%, 50%, 0)`)

  context.fillStyle = gradient
  context.beginPath()
  context.arc(firefly.x, firefly.y, glowRadius, 0, TAU)
  context.fill()
}

/**
 * Paints one firefly frame.
 */
const renderScene = ({
  scene,
  viewport,
  context,
  deltaSeconds,
  elapsedSeconds
}: {
  scene: FirefliesScene
  viewport: CanvasViewport
  context: CanvasRenderingContext2D
  deltaSeconds: number
  elapsedSeconds: number
}): void => {
  context.clearRect(0, 0, viewport.width, viewport.height)
  context.save()
  context.globalCompositeOperation = 'lighter'

  scene.fireflies.forEach((firefly) => {
    if (deltaSeconds > 0) {
      updateFirefly(firefly, deltaSeconds, viewport)
    }
    drawFirefly(context, firefly, elapsedSeconds)
  })

  context.restore()
}

export const animation: BackgroundAnimation = {
  id: 'fireflies',
  weight: 1,
  background:
    'radial-gradient(circle at 30% 20%, rgba(24, 65, 50, 0.68), transparent 42%), linear-gradient(180deg, rgb(4, 11, 18), rgb(3, 7, 12))',
  initialize: (canvas) =>
    initializeCanvasAnimation(canvas, {
      createScene,
      renderScene
    })
}

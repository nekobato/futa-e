/**
 * Noise-like flow field particle animation for Futa-e backgrounds.
 */

import type { BackgroundAnimation } from './types'
import {
  initializeCanvasAnimation,
  randomBetween,
  type CanvasViewport
} from './shared'

type FlowParticle = {
  x: number
  y: number
  previousX: number
  previousY: number
  speed: number
  hue: number
}

type FlowFieldScene = {
  particles: FlowParticle[]
}

/**
 * Creates a particle at a random viewport position.
 */
const createParticle = (viewport: CanvasViewport): FlowParticle => {
  const x = randomBetween(0, viewport.width)
  const y = randomBetween(0, viewport.height)

  return {
    x,
    y,
    previousX: x,
    previousY: y,
    speed: randomBetween(42, 86),
    hue: randomBetween(165, 220)
  }
}

/**
 * Creates a flow field scene sized for the viewport.
 */
const createScene = (viewport: CanvasViewport): FlowFieldScene => ({
  particles: Array.from(
    {
      length: Math.round(
        Math.min(980, Math.max(260, (viewport.width * viewport.height) / 1400))
      )
    },
    () => createParticle(viewport)
  )
})

/**
 * Computes the local flow angle at a viewport coordinate.
 */
const getFlowAngle = (x: number, y: number, elapsedSeconds: number): number =>
  Math.sin(x * 0.006 + elapsedSeconds * 0.38) * 1.4 +
  Math.cos(y * 0.007 - elapsedSeconds * 0.28) * 1.1 +
  Math.sin((x + y) * 0.003 + elapsedSeconds * 0.18) * 1.6

/**
 * Respawns a particle near a random edge so streams keep crossing the viewport.
 */
const respawnParticle = (
  particle: FlowParticle,
  viewport: CanvasViewport
): void => {
  const edge = Math.floor(randomBetween(0, 4))

  if (edge === 0) {
    particle.x = randomBetween(0, viewport.width)
    particle.y = 0
  } else if (edge === 1) {
    particle.x = viewport.width
    particle.y = randomBetween(0, viewport.height)
  } else if (edge === 2) {
    particle.x = randomBetween(0, viewport.width)
    particle.y = viewport.height
  } else {
    particle.x = 0
    particle.y = randomBetween(0, viewport.height)
  }

  particle.previousX = particle.x
  particle.previousY = particle.y
  particle.hue = randomBetween(165, 220)
}

/**
 * Advances one flow particle through the vector field.
 */
const updateParticle = (
  particle: FlowParticle,
  viewport: CanvasViewport,
  deltaSeconds: number,
  elapsedSeconds: number
): void => {
  particle.previousX = particle.x
  particle.previousY = particle.y

  const angle = getFlowAngle(particle.x, particle.y, elapsedSeconds)
  particle.x += Math.cos(angle) * particle.speed * deltaSeconds
  particle.y += Math.sin(angle) * particle.speed * deltaSeconds

  if (
    particle.x < -24 ||
    particle.x > viewport.width + 24 ||
    particle.y < -24 ||
    particle.y > viewport.height + 24
  ) {
    respawnParticle(particle, viewport)
  }
}

/**
 * Paints one flow field frame with fading trails.
 */
const renderScene = ({
  scene,
  viewport,
  context,
  deltaSeconds,
  elapsedSeconds
}: {
  scene: FlowFieldScene
  viewport: CanvasViewport
  context: CanvasRenderingContext2D
  deltaSeconds: number
  elapsedSeconds: number
}): void => {
  if (deltaSeconds === 0) {
    context.fillStyle = 'rgba(4, 14, 20, 0.96)'
    context.fillRect(0, 0, viewport.width, viewport.height)
  } else {
    context.fillStyle = 'rgba(4, 14, 20, 0.08)'
    context.fillRect(0, 0, viewport.width, viewport.height)
  }

  context.save()
  context.globalCompositeOperation = 'lighter'
  context.lineWidth = 0.8

  scene.particles.forEach((particle) => {
    if (deltaSeconds > 0) {
      updateParticle(particle, viewport, deltaSeconds, elapsedSeconds)
    }

    context.strokeStyle = `hsla(${particle.hue}, 76%, 62%, 0.18)`
    context.beginPath()
    context.moveTo(particle.previousX, particle.previousY)
    context.lineTo(particle.x, particle.y)
    context.stroke()
  })

  context.restore()
}

export const animation: BackgroundAnimation = {
  id: 'flow-field',
  weight: 1,
  background:
    'radial-gradient(circle at 20% 28%, rgba(25, 96, 98, 0.45), transparent 38%), linear-gradient(180deg, rgb(4, 14, 20), rgb(6, 9, 15))',
  initialize: (canvas) =>
    initializeCanvasAnimation(canvas, {
      createScene,
      renderScene
    })
}

/**
 * Constellation network animation for Futa-e backgrounds.
 */

import type { BackgroundAnimation } from './types'
import { TAU, initializeCanvasAnimation, randomBetween, type CanvasViewport } from './shared'

type NodePoint = {
  x: number
  y: number
  velocityX: number
  velocityY: number
  radius: number
}

type ConstellationScene = {
  points: NodePoint[]
}

/**
 * Creates a field of moving constellation points.
 */
const createScene = (viewport: CanvasViewport): ConstellationScene => {
  const count = Math.round(Math.min(110, Math.max(44, (viewport.width * viewport.height) / 16000)))

  return {
    points: Array.from({ length: count }, () => ({
      x: randomBetween(0, viewport.width),
      y: randomBetween(0, viewport.height),
      velocityX: randomBetween(-18, 18),
      velocityY: randomBetween(-14, 14),
      radius: randomBetween(0.9, 2.1)
    }))
  }
}

/**
 * Moves one constellation point within the viewport.
 */
const updatePoint = (point: NodePoint, deltaSeconds: number, viewport: CanvasViewport): void => {
  point.x += point.velocityX * deltaSeconds
  point.y += point.velocityY * deltaSeconds

  if (point.x < 0 || point.x > viewport.width) {
    point.velocityX *= -1
  }
  if (point.y < 0 || point.y > viewport.height) {
    point.velocityY *= -1
  }
}

/**
 * Draws connecting lines between nearby constellation points.
 */
const drawConnections = (
  context: CanvasRenderingContext2D,
  points: NodePoint[],
  viewport: CanvasViewport
): void => {
  const maxDistance = Math.min(150, Math.max(92, viewport.width / 9))

  for (let index = 0; index < points.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < points.length; nextIndex += 1) {
      const first = points[index]
      const second = points[nextIndex]
      const distance = Math.hypot(first.x - second.x, first.y - second.y)

      if (distance > maxDistance) {
        continue
      }

      const alpha = (1 - distance / maxDistance) * 0.22
      context.strokeStyle = `rgba(174, 211, 255, ${alpha})`
      context.lineWidth = 0.7
      context.beginPath()
      context.moveTo(first.x, first.y)
      context.lineTo(second.x, second.y)
      context.stroke()
    }
  }
}

/**
 * Draws all constellation nodes.
 */
const drawPoints = (context: CanvasRenderingContext2D, points: NodePoint[], elapsedSeconds: number): void => {
  points.forEach((point, index) => {
    const shimmer = 0.72 + Math.sin(elapsedSeconds * 1.4 + index * 0.71) * 0.28
    context.fillStyle = `rgba(235, 247, 255, ${0.5 + shimmer * 0.42})`
    context.beginPath()
    context.arc(point.x, point.y, point.radius * shimmer, 0, TAU)
    context.fill()
  })
}

/**
 * Paints one constellation frame.
 */
const renderScene = ({
  scene,
  viewport,
  context,
  deltaSeconds,
  elapsedSeconds
}: {
  scene: ConstellationScene
  viewport: CanvasViewport
  context: CanvasRenderingContext2D
  deltaSeconds: number
  elapsedSeconds: number
}): void => {
  context.clearRect(0, 0, viewport.width, viewport.height)

  scene.points.forEach((point) => {
    if (deltaSeconds > 0) {
      updatePoint(point, deltaSeconds, viewport)
    }
  })

  drawConnections(context, scene.points, viewport)
  drawPoints(context, scene.points, elapsedSeconds)
}

export const animation: BackgroundAnimation = {
  id: 'constellation',
  weight: 1,
  background:
    'radial-gradient(circle at 72% 18%, rgba(51, 87, 129, 0.58), transparent 36%), linear-gradient(180deg, rgb(8, 13, 26), rgb(5, 8, 16))',
  initialize: (canvas) =>
    initializeCanvasAnimation(canvas, {
      createScene,
      renderScene
    })
}

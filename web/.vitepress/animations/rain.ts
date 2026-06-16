/**
 * Futa-e wrapper for the nekobato.net rain background animation.
 */

import type { BackgroundAnimation } from './types'

const MAX_DEVICE_PIXEL_RATIO = 2
const RAIN_ANGLE_RADIANS = (78 * Math.PI) / 180
const OFFSCREEN_MARGIN = 64

type RainDrop = {
  x: number
  y: number
  speed: number
  length: number
  thickness: number
  opacity: number
}

/**
 * Returns a random number inside the provided range.
 */
const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min)

/**
 * Restricts a value to the provided minimum and maximum bounds.
 */
const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

/**
 * Formats an alpha value as a white-blue rain color.
 */
const toRainColor = (alpha: number): string => `rgba(230, 241, 255, ${clamp(alpha, 0, 1)})`

/**
 * Resizes the canvas to match the viewport and device pixel ratio.
 */
const resizeCanvas = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
): { width: number; height: number } => {
  const width = window.innerWidth
  const height = window.innerHeight
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO)

  canvas.width = Math.floor(width * devicePixelRatio)
  canvas.height = Math.floor(height * devicePixelRatio)
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

  return { width, height }
}

/**
 * Calculates a raindrop count that scales with the viewport size.
 */
const getDropCount = (viewportWidth: number, viewportHeight: number): number =>
  clamp(Math.round((viewportWidth + viewportHeight) / 22), 56, 136)

/**
 * Places a raindrop either inside the current viewport or just above it.
 */
const positionDrop = (
  drop: RainDrop,
  viewportWidth: number,
  viewportHeight: number,
  phase: 'initial' | 'respawn'
): RainDrop => {
  if (phase === 'initial') {
    drop.x = randomBetween(-viewportWidth * 0.15, viewportWidth * 1.05)
    drop.y = randomBetween(-viewportHeight * 0.2, viewportHeight * 1.05)
    return drop
  }

  drop.x = randomBetween(-viewportWidth * 0.1, viewportWidth * 0.95)
  drop.y = randomBetween(-viewportHeight * 0.45, -16)
  return drop
}

/**
 * Creates a single raindrop with randomized visual properties.
 */
const createDrop = (viewportWidth: number, viewportHeight: number, phase: 'initial' | 'respawn'): RainDrop =>
  positionDrop(
    {
      x: 0,
      y: 0,
      speed: randomBetween(620, 1120),
      length: randomBetween(16, 42),
      thickness: randomBetween(0.7, 1.6),
      opacity: randomBetween(0.16, 0.34)
    },
    viewportWidth,
    viewportHeight,
    phase
  )

/**
 * Builds the rain field for the current viewport.
 */
const createRainField = (viewportWidth: number, viewportHeight: number): RainDrop[] =>
  Array.from({ length: getDropCount(viewportWidth, viewportHeight) }, () =>
    createDrop(viewportWidth, viewportHeight, 'initial')
  )

/**
 * Advances a raindrop and respawns it after it leaves the viewport.
 */
const updateDrop = (
  drop: RainDrop,
  deltaSeconds: number,
  viewportWidth: number,
  viewportHeight: number
): void => {
  const velocityX = Math.cos(RAIN_ANGLE_RADIANS) * drop.speed
  const velocityY = Math.sin(RAIN_ANGLE_RADIANS) * drop.speed

  drop.x += velocityX * deltaSeconds
  drop.y += velocityY * deltaSeconds

  if (drop.x > viewportWidth + OFFSCREEN_MARGIN || drop.y > viewportHeight + OFFSCREEN_MARGIN) {
    positionDrop(drop, viewportWidth, viewportHeight, 'respawn')
  }
}

/**
 * Draws a single rain streak.
 */
const drawDrop = (context: CanvasRenderingContext2D, drop: RainDrop): void => {
  const tailX = drop.x - Math.cos(RAIN_ANGLE_RADIANS) * drop.length
  const tailY = drop.y - Math.sin(RAIN_ANGLE_RADIANS) * drop.length
  const gradient = context.createLinearGradient(tailX, tailY, drop.x, drop.y)

  gradient.addColorStop(0, toRainColor(0))
  gradient.addColorStop(0.65, toRainColor(drop.opacity * 0.55))
  gradient.addColorStop(1, toRainColor(drop.opacity))

  context.beginPath()
  context.strokeStyle = gradient
  context.lineWidth = drop.thickness
  context.lineCap = 'round'
  context.moveTo(tailX, tailY)
  context.lineTo(drop.x, drop.y)
  context.stroke()
}

/**
 * A slanted rain field that softly falls behind the page content.
 */
export const animation: BackgroundAnimation = {
  id: 'rain',
  weight: 1,
  background:
    'linear-gradient(180deg, rgb(95, 120, 133) 0%, rgb(68, 89, 101) 52%, rgb(49, 66, 76) 100%)',
  initialize: (canvas: HTMLCanvasElement): (() => void) => {
    const context = canvas.getContext('2d')

    if (!context) {
      return () => {}
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const abortController = new AbortController()

    let viewport = resizeCanvas(canvas, context)
    let drops = createRainField(viewport.width, viewport.height)
    let animationFrameId = 0
    let lastFrameTimestamp = 0

    /**
     * Paints the current frame and optionally advances the rainfall.
     */
    const renderScene = (deltaSeconds: number): void => {
      context.clearRect(0, 0, viewport.width, viewport.height)
      context.save()
      context.globalCompositeOperation = 'screen'

      drops.forEach((drop) => {
        if (deltaSeconds > 0) {
          updateDrop(drop, deltaSeconds, viewport.width, viewport.height)
        }

        drawDrop(context, drop)
      })

      context.restore()
    }

    /**
     * Stops the active animation loop if it is running.
     */
    const stopLoop = (): void => {
      if (animationFrameId === 0) {
        return
      }

      cancelAnimationFrame(animationFrameId)
      animationFrameId = 0
    }

    /**
     * Runs the next animation frame.
     */
    const tick = (timestamp: number): void => {
      if (lastFrameTimestamp === 0) {
        lastFrameTimestamp = timestamp
      }

      const deltaSeconds = Math.min((timestamp - lastFrameTimestamp) / 1000, 0.05)
      lastFrameTimestamp = timestamp
      renderScene(deltaSeconds)
      animationFrameId = requestAnimationFrame(tick)
    }

    /**
     * Starts the animation loop unless motion should be reduced.
     */
    const startLoop = (): void => {
      if (animationFrameId !== 0) {
        return
      }

      if (motionQuery.matches || document.hidden) {
        renderScene(0)
        return
      }

      lastFrameTimestamp = 0
      animationFrameId = requestAnimationFrame(tick)
    }

    /**
     * Recreates the rain field to fit the latest viewport.
     */
    const handleResize = (): void => {
      viewport = resizeCanvas(canvas, context)
      drops = createRainField(viewport.width, viewport.height)
      renderScene(0)
      startLoop()
    }

    /**
     * Pauses the loop while the document is hidden to avoid needless work.
     */
    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        stopLoop()
        return
      }

      startLoop()
    }

    /**
     * Responds to reduced-motion preference changes.
     */
    const handleMotionPreferenceChange = (): void => {
      stopLoop()
      renderScene(0)
      startLoop()
    }

    window.addEventListener('resize', handleResize, {
      passive: true,
      signal: abortController.signal
    })
    document.addEventListener('visibilitychange', handleVisibilityChange, {
      signal: abortController.signal
    })
    motionQuery.addEventListener('change', handleMotionPreferenceChange, {
      signal: abortController.signal
    })

    renderScene(0)
    startLoop()

    return () => {
      stopLoop()
      abortController.abort()
      context.clearRect(0, 0, viewport.width, viewport.height)
    }
  }
}

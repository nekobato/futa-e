/**
 * Factory for meteor-style Futa-e canvas background animations.
 */

import type { BackgroundAnimation } from './types'

const OFFSCREEN_MARGIN = 320
const MAX_DEVICE_PIXEL_RATIO = 2
const DEFAULT_TRAJECTORY_ANGLE_DEGREES = 35
const DEFAULT_BASE_COUNT_RANGE = [16, 32] as const

type NumericRange = readonly [number, number]
type RgbColor = readonly [number, number, number]

type Meteor = {
  x: number
  y: number
  speed: number
  length: number
  thickness: number
  opacity: number
  glow: number
  delayMs: number
}

type MeteorAnimationConfig = {
  id: string
  weight?: number
  background: string
  densityMultiplier: number
  angleDegrees?: number
  baseCountRange?: NumericRange
  speedRange: NumericRange
  lengthRange: NumericRange
  thicknessRange: NumericRange
  opacityRange: NumericRange
  glowRange: NumericRange
  trailColor: RgbColor
  headColor: RgbColor
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
 * Formats an RGB tuple into an rgba() string.
 */
const toRgba = (color: RgbColor, alpha: number): string =>
  `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${clamp(alpha, 0, 1)})`

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
 * Builds a meteor background animation from a small configuration object.
 */
export const createMeteorAnimation = (config: MeteorAnimationConfig): BackgroundAnimation => ({
  id: config.id,
  weight: config.weight,
  background: config.background,
  initialize: (canvas: HTMLCanvasElement): (() => void) => {
    const context = canvas.getContext('2d')

    if (!context) {
      return () => {}
    }

    const trajectoryAngleRadians = ((config.angleDegrees ?? DEFAULT_TRAJECTORY_ANGLE_DEGREES) * Math.PI) / 180
    const trajectoryCosine = Math.cos(trajectoryAngleRadians)
    const trajectorySine = Math.sin(trajectoryAngleRadians)
    const [minimumBaseCount, maximumBaseCount] = config.baseCountRange ?? DEFAULT_BASE_COUNT_RANGE
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const abortController = new AbortController()

    /**
     * Calculates a meteor count that scales with the viewport area.
     */
    const getMeteorCount = (viewportWidth: number, viewportHeight: number): number => {
      const baseCount = clamp(Math.round((viewportWidth + viewportHeight) / 120), minimumBaseCount, maximumBaseCount)

      return Math.max(1, Math.round(baseCount * config.densityMultiplier))
    }

    /**
     * Places a meteor either across the current viewport or just outside of it.
     */
    const positionMeteor = (
      meteor: Meteor,
      viewportWidth: number,
      viewportHeight: number,
      phase: 'initial' | 'respawn'
    ): Meteor => {
      meteor.delayMs = phase === 'initial' ? randomBetween(0, 2400) : randomBetween(180, 1600)

      if (phase === 'initial') {
        meteor.x = randomBetween(-viewportWidth * 0.2, viewportWidth * 1.05)
        meteor.y = randomBetween(-viewportHeight * 0.3, viewportHeight * 0.85)
        return meteor
      }

      const enterFromTop = Math.random() > 0.35

      if (enterFromTop) {
        meteor.x = randomBetween(-viewportWidth * 0.15, viewportWidth * 0.85)
        meteor.y = randomBetween(-viewportHeight * 0.55, -32)
        return meteor
      }

      meteor.x = randomBetween(-OFFSCREEN_MARGIN, -48)
      meteor.y = randomBetween(-viewportHeight * 0.15, viewportHeight * 0.45)
      return meteor
    }

    /**
     * Creates a meteor with randomized visual properties.
     */
    const createMeteor = (
      viewportWidth: number,
      viewportHeight: number,
      phase: 'initial' | 'respawn'
    ): Meteor =>
      positionMeteor(
        {
          x: 0,
          y: 0,
          speed: randomBetween(...config.speedRange),
          length: randomBetween(...config.lengthRange),
          thickness: randomBetween(...config.thicknessRange),
          opacity: randomBetween(...config.opacityRange),
          glow: randomBetween(...config.glowRange),
          delayMs: 0
        },
        viewportWidth,
        viewportHeight,
        phase
      )

    /**
     * Builds the meteor field for the current viewport.
     */
    const createMeteorField = (viewportWidth: number, viewportHeight: number): Meteor[] =>
      Array.from({ length: getMeteorCount(viewportWidth, viewportHeight) }, () =>
        createMeteor(viewportWidth, viewportHeight, 'initial')
      )

    /**
     * Advances a meteor and respawns it after it leaves the viewport.
     */
    const updateMeteor = (
      meteor: Meteor,
      deltaSeconds: number,
      viewportWidth: number,
      viewportHeight: number
    ): void => {
      if (meteor.delayMs > 0) {
        meteor.delayMs = Math.max(0, meteor.delayMs - deltaSeconds * 1000)
        return
      }

      meteor.x += trajectoryCosine * meteor.speed * deltaSeconds
      meteor.y += trajectorySine * meteor.speed * deltaSeconds

      const tailX = meteor.x - trajectoryCosine * meteor.length
      const tailY = meteor.y - trajectorySine * meteor.length

      if (
        meteor.x > viewportWidth + OFFSCREEN_MARGIN ||
        meteor.y > viewportHeight + OFFSCREEN_MARGIN ||
        tailX > viewportWidth + OFFSCREEN_MARGIN ||
        tailY > viewportHeight + OFFSCREEN_MARGIN
      ) {
        positionMeteor(meteor, viewportWidth, viewportHeight, 'respawn')
      }
    }

    /**
     * Draws a single meteor streak and its highlight.
     */
    const drawMeteor = (drawingContext: CanvasRenderingContext2D, meteor: Meteor): void => {
      if (meteor.delayMs > 0) {
        return
      }

      const tailX = meteor.x - trajectoryCosine * meteor.length
      const tailY = meteor.y - trajectorySine * meteor.length
      const gradient = drawingContext.createLinearGradient(tailX, tailY, meteor.x, meteor.y)

      gradient.addColorStop(0, toRgba(config.trailColor, 0))
      gradient.addColorStop(0.55, toRgba(config.trailColor, meteor.opacity * 0.35))
      gradient.addColorStop(1, toRgba(config.headColor, meteor.opacity))

      drawingContext.save()
      drawingContext.globalCompositeOperation = 'lighter'
      drawingContext.lineCap = 'round'
      drawingContext.strokeStyle = gradient
      drawingContext.lineWidth = meteor.thickness
      drawingContext.shadowColor = toRgba(config.trailColor, meteor.opacity * 0.55)
      drawingContext.shadowBlur = meteor.glow
      drawingContext.beginPath()
      drawingContext.moveTo(tailX, tailY)
      drawingContext.lineTo(meteor.x, meteor.y)
      drawingContext.stroke()
      drawingContext.fillStyle = toRgba(config.headColor, meteor.opacity)
      drawingContext.beginPath()
      drawingContext.arc(meteor.x, meteor.y, meteor.thickness * 0.75, 0, Math.PI * 2)
      drawingContext.fill()
      drawingContext.restore()
    }

    let viewport = resizeCanvas(canvas, context)
    let meteors = createMeteorField(viewport.width, viewport.height)
    let animationFrameId = 0
    let lastFrameTimestamp = 0

    /**
     * Paints the current frame and optionally advances the meteor positions.
     */
    const renderScene = (deltaSeconds: number): void => {
      context.clearRect(0, 0, viewport.width, viewport.height)

      meteors.forEach((meteor) => {
        if (deltaSeconds > 0) {
          updateMeteor(meteor, deltaSeconds, viewport.width, viewport.height)
        }

        drawMeteor(context, meteor)
      })
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
     * Recreates the meteor field to fit the latest viewport.
     */
    const handleResize = (): void => {
      viewport = resizeCanvas(canvas, context)
      meteors = createMeteorField(viewport.width, viewport.height)
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
})

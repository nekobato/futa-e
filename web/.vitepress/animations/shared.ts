/**
 * Shared canvas helpers for Futa-e background animations.
 */

const MAX_DEVICE_PIXEL_RATIO = 2

export const TAU = Math.PI * 2

export type CanvasViewport = {
  width: number
  height: number
  devicePixelRatio: number
}

export type RenderSceneParams<TScene> = {
  scene: TScene
  viewport: CanvasViewport
  context: CanvasRenderingContext2D
  deltaSeconds: number
  elapsedSeconds: number
}

export type CanvasAnimationOptions<TScene> = {
  createScene: (viewport: CanvasViewport, context: CanvasRenderingContext2D) => TScene
  renderScene: (params: RenderSceneParams<TScene>) => void
}

/**
 * Restricts a value to the provided minimum and maximum bounds.
 */
export const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

/**
 * Returns a random number inside the provided range.
 */
export const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min)

/**
 * Returns a random integer inside the inclusive range.
 */
export const randomInteger = (min: number, max: number): number => Math.floor(randomBetween(min, max + 1))

/**
 * Resizes a canvas to viewport-sized CSS pixels with a capped device pixel ratio.
 */
export const resizeCanvas = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D
): CanvasViewport => {
  const width = window.innerWidth
  const height = window.innerHeight
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO)

  canvas.width = Math.floor(width * devicePixelRatio)
  canvas.height = Math.floor(height * devicePixelRatio)
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

  return { width, height, devicePixelRatio }
}

/**
 * Creates a standard requestAnimationFrame lifecycle for full-screen background canvases.
 */
export const initializeCanvasAnimation = <TScene>(
  canvas: HTMLCanvasElement,
  options: CanvasAnimationOptions<TScene>
): (() => void) => {
  const context = canvas.getContext('2d')

  if (!context) {
    return () => {}
  }

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let viewport = resizeCanvas(canvas, context)
  let scene = options.createScene(viewport, context)
  let animationFrameId = 0
  let firstFrameTimestamp = 0
  let lastFrameTimestamp = 0

  /**
   * Renders the scene with the current viewport and time values.
   */
  const renderCurrentScene = (deltaSeconds: number, elapsedSeconds: number): void => {
    options.renderScene({
      scene,
      viewport,
      context,
      deltaSeconds,
      elapsedSeconds
    })
  }

  /**
   * Stops the active animation frame loop.
   */
  const stopLoop = (): void => {
    if (animationFrameId === 0) {
      return
    }

    cancelAnimationFrame(animationFrameId)
    animationFrameId = 0
  }

  /**
   * Renders one animation frame and schedules the next one.
   */
  const tick = (timestamp: number): void => {
    if (firstFrameTimestamp === 0) {
      firstFrameTimestamp = timestamp
    }
    if (lastFrameTimestamp === 0) {
      lastFrameTimestamp = timestamp
    }

    const deltaSeconds = Math.min((timestamp - lastFrameTimestamp) / 1000, 0.05)
    const elapsedSeconds = (timestamp - firstFrameTimestamp) / 1000
    lastFrameTimestamp = timestamp
    renderCurrentScene(deltaSeconds, elapsedSeconds)
    animationFrameId = requestAnimationFrame(tick)
  }

  /**
   * Starts the animation loop unless user or browser state says to pause.
   */
  const startLoop = (): void => {
    if (animationFrameId !== 0) {
      return
    }

    if (motionQuery.matches || document.hidden) {
      renderCurrentScene(0, 0)
      return
    }

    firstFrameTimestamp = 0
    lastFrameTimestamp = 0
    animationFrameId = requestAnimationFrame(tick)
  }

  /**
   * Rebuilds the scene for the latest viewport.
   */
  const handleResize = (): void => {
    viewport = resizeCanvas(canvas, context)
    scene = options.createScene(viewport, context)
    renderCurrentScene(0, 0)
    startLoop()
  }

  /**
   * Pauses rendering while the page is hidden.
   */
  const handleVisibilityChange = (): void => {
    if (document.hidden) {
      stopLoop()
      return
    }

    startLoop()
  }

  /**
   * Reconciles the loop when reduced-motion preferences change.
   */
  const handleMotionPreferenceChange = (): void => {
    stopLoop()
    renderCurrentScene(0, 0)
    startLoop()
  }

  window.addEventListener('resize', handleResize, { passive: true })
  document.addEventListener('visibilitychange', handleVisibilityChange)
  motionQuery.addEventListener('change', handleMotionPreferenceChange)
  renderCurrentScene(0, 0)
  startLoop()

  return () => {
    stopLoop()
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    motionQuery.removeEventListener('change', handleMotionPreferenceChange)
    context.clearRect(0, 0, viewport.width, viewport.height)
  }
}

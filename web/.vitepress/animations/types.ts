/**
 * Shared animation contracts for Futa-e web background pages.
 */

/**
 * Defines the contract for a mountable full-screen canvas background.
 */
export type BackgroundAnimation = {
  id: string
  weight?: number
  background: string
  initialize: (canvas: HTMLCanvasElement) => () => void
}

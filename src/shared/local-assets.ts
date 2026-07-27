import type { AssetType } from './types'

export type LocalAssetType = Exclude<AssetType, 'web'>

export const SAFE_MODE_MEDIA_SOURCE = '/safe-mode.svg'

/**
 * Narrows a playlist asset type to locally servable image and video types.
 */
export const isLocalAssetType = (
  value: AssetType | string
): value is LocalAssetType => value === 'image' || value === 'video'

/**
 * Validates the opaque identifiers exposed to renderer processes.
 */
export const isOpaqueAssetId = (value: string): boolean =>
  /^[A-Za-z0-9_-]{16,128}$/.test(value)

/** Identifies renderer assets bundled with the application. */
export const isBundledMediaSource = (value: string): boolean =>
  value === SAFE_MODE_MEDIA_SOURCE

export type AssetType = 'image' | 'video' | 'web'
export type DisplayMode = 'mirror' | 'per-display'

export type OverlayConfig = {
  title: string
  message: string
  imageSrc?: string
}

export type PlaylistItem = {
  id: string
  type: AssetType
  title: string
  src: string
  originUrl?: string
  durationSec?: number
  fallbackSrc?: string
  mute?: boolean
}

export type PlayerConfig = {
  version: 1
  playlist: PlaylistItem[]
  loop: boolean
  shuffle: boolean
  defaultDurationSec: number
  webTimeoutSec: number
  overlay: OverlayConfig
  displayMode: DisplayMode
  displays: Record<string, DisplayConfig>
  updatedAt: string
}

export type PlayerStatus = {
  running: boolean
  displayCount: number
  overlayEnabled: boolean
}

export type PickedAsset = {
  path: string
  type: AssetType
}

export type CacheResult = {
  localPath: string
  originalUrl: string
}

export type DisplayBounds = {
  x: number
  y: number
  width: number
  height: number
}

export type DisplayInfo = {
  id: string
  label: string
  isPrimary: boolean
  bounds: DisplayBounds
}

export type DisplayConfig = {
  enabled: boolean
  playlist: PlaylistItem[]
  overlay: OverlayConfig
}

export type AssetType = 'image' | 'video' | 'web'

export type PlaylistItem = {
  id: string
  type: AssetType
  src: string
  originUrl?: string
  durationSec?: number
  fallbackSrc?: string
  mute?: boolean
}

export type PlaylistConfig = {
  id: string
  name: string
  perDisplay: boolean
  loop: boolean
  shuffle: boolean
  defaultDurationSec: number
  webTimeoutSec: number
  items: PlaylistItem[]
}

export type PlayerConfig = {
  version: 1
  activePlaylistId: string
  playlists: PlaylistConfig[]
  displays: Record<string, DisplayConfig>
  updatedAt: string
}

export type PlayerStatus = {
  running: boolean
  displayCount: number
}

export type PickedAsset = {
  path: string
  type: AssetType
  name?: string
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
  playlists: PlaylistConfig[]
}

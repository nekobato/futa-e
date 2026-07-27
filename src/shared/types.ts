export type AssetType = 'image' | 'video' | 'web'

/**
 * Controls how a playlist item advances after it starts rendering.
 */
export type PlaylistItemPlaybackMode = 'auto' | 'duration' | 'forever'

export type PlaylistItem = {
  id: string
  type: AssetType
  src: string
  sourceName?: string
  playbackMode?: PlaylistItemPlaybackMode
  durationSec?: number
  fallbackSrc?: string
  fallbackName?: string
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
  id: string
  type: AssetType
  name: string
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

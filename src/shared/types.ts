export type PlayerMode = 'signage' | 'decor' | 'privacy'
export type AssetType = 'image' | 'video' | 'web'

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
  mode: PlayerMode
  playlist: PlaylistItem[]
  loop: boolean
  shuffle: boolean
  defaultDurationSec: number
  webTimeoutSec: number
  updatedAt: string
}

export type PlayerStatus = {
  running: boolean
  displayCount: number
}

export type PickedAsset = {
  path: string
  type: AssetType
}

export type CacheResult = {
  localPath: string
  originalUrl: string
}

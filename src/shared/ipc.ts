import type { AssetType, CacheResult, PickedAsset, PlayerConfig, PlayerStatus } from './types'

export type AssetPickOptions = {
  kind?: 'image' | 'video' | 'media'
}

export type FutaeApi = {
  config: {
    get: () => Promise<PlayerConfig>
    save: (next: PlayerConfig) => Promise<PlayerConfig>
    onUpdated: (handler: (config: PlayerConfig) => void) => () => void
  }
  assets: {
    pickFiles: (options?: AssetPickOptions) => Promise<PickedAsset[]>
    pickFolder: () => Promise<PickedAsset[]>
    cacheRemote: (url: string, type: AssetType) => Promise<CacheResult | null>
  }
  player: {
    start: () => Promise<PlayerStatus>
    stop: () => Promise<PlayerStatus>
    status: () => Promise<PlayerStatus>
    setPrivacy: (enabled: boolean) => Promise<void>
    onPrivacy: (handler: (enabled: boolean) => void) => () => void
    heartbeat: () => void
  }
  utils: {
    toFileUrl: (filePath: string) => string
  }
}

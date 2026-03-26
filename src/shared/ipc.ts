import type {
  AssetType,
  CacheResult,
  DisplayInfo,
  PickedAsset,
  PlayerConfig,
  PlayerStatus
} from './types'

export type AssetPickOptions = {
  kind?: 'image' | 'video' | 'media'
}

export type FutaeApi = {
  config: {
    get: () => Promise<PlayerConfig>
    getPlayback: () => Promise<PlayerConfig>
    save: (next: PlayerConfig) => Promise<PlayerConfig>
    onUpdated: (handler: (config: PlayerConfig) => void) => () => void
  }
  assets: {
    pickFiles: (options?: AssetPickOptions) => Promise<PickedAsset[]>
    cacheRemote: (url: string, type: AssetType) => Promise<CacheResult | null>
  }
  displays: {
    list: () => Promise<DisplayInfo[]>
    onChanged: (handler: (displays: DisplayInfo[]) => void) => () => void
  }
  player: {
    start: () => Promise<PlayerStatus>
    stop: () => Promise<PlayerStatus>
    status: () => Promise<PlayerStatus>
    heartbeat: () => void
  }
  utils: {
    toFileUrl: (filePath: string) => string
  }
}

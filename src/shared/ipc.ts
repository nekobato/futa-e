import type {
  DisplayInfo,
  PickedAsset,
  PlayerConfig,
  PlayerStatus
} from './types'

export type AssetPickOptions = {
  kind?: 'image' | 'video' | 'media'
}

export type ConfigDiagnostics = {
  backend: 'electron-store'
  configExists: boolean
  configPath: string | null
}

export type LaunchAtLoginSettings = {
  supported: boolean
  enabled: boolean
}

export type KioskExitShortcutSettings = {
  accelerator: string
  registered: boolean
}

export type FutaeApi = {
  config: {
    get: () => Promise<PlayerConfig>
    getDiagnostics: () => Promise<ConfigDiagnostics>
    getPlayback: () => Promise<PlayerConfig>
    save: (next: PlayerConfig) => Promise<PlayerConfig>
    onUpdated: (handler: (config: PlayerConfig) => void) => () => void
  }
  assets: {
    pickFiles: (options?: AssetPickOptions) => Promise<PickedAsset[]>
    toUrl: (assetId: string) => string
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
  system: {
    getLaunchAtLogin: () => Promise<LaunchAtLoginSettings>
    setLaunchAtLogin: (enabled: boolean) => Promise<LaunchAtLoginSettings>
    getKioskExitShortcut: () => Promise<KioskExitShortcutSettings>
    setKioskExitShortcut: (
      accelerator: string
    ) => Promise<KioskExitShortcutSettings>
  }
}

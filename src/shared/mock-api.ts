import type {
  AssetType,
  CacheResult,
  DisplayInfo,
  PlayerConfig,
  PlayerStatus
} from './types'
import type { AssetPickOptions, FutaeApi } from './ipc'
import { coerceConfig, createDefaultConfig } from './defaults'
import { countEnabledDisplays, ensureDisplayConfigs } from './player-config'

const CONFIG_KEY = 'futae:mock:config'
const OVERLAY_KEY = 'futae:mock:overlay'
const STATUS_KEY = 'futae:mock:status'

const CONFIG_EVENT = 'futae:mock:config'
const OVERLAY_EVENT = 'futae:mock:overlay'

const defaultDisplays = (): DisplayInfo[] => [
  {
    id: '1',
    label: 'Display 1',
    isPrimary: true,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 }
  },
  {
    id: '2',
    label: 'Display 2',
    isPrimary: false,
    bounds: { x: 1920, y: 0, width: 1920, height: 1080 }
  }
]

const readDisplays = (): DisplayInfo[] => defaultDisplays()

const readOverlay = (): boolean =>
  window.localStorage.getItem(OVERLAY_KEY) === 'true'

const readStatus = (): PlayerStatus => {
  const stored = window.localStorage.getItem(STATUS_KEY)
  if (!stored) {
    return { running: false, displayCount: 0, overlayEnabled: readOverlay() }
  }

  try {
    return JSON.parse(stored) as PlayerStatus
  } catch {
    return { running: false, displayCount: 0, overlayEnabled: readOverlay() }
  }
}

const writeStatus = (status: PlayerStatus): PlayerStatus => {
  window.localStorage.setItem(STATUS_KEY, JSON.stringify(status))
  return status
}

const readConfig = (): PlayerConfig => {
  const stored = window.localStorage.getItem(CONFIG_KEY)
  const config = stored
    ? coerceConfig(JSON.parse(stored))
    : createDefaultConfig()
  return ensureDisplayConfigs(config, readDisplays())
}

const writeConfig = (config: PlayerConfig): PlayerConfig => {
  const normalized = ensureDisplayConfigs(coerceConfig(config), readDisplays())
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify(normalized))
  window.dispatchEvent(
    new CustomEvent<PlayerConfig>(CONFIG_EVENT, { detail: normalized })
  )

  const status = readStatus()
  if (status.running) {
    writeStatus({
      running: true,
      displayCount: countEnabledDisplays(normalized, readDisplays()),
      overlayEnabled: status.overlayEnabled
    })
  }

  return normalized
}

const writeOverlay = (enabled: boolean) => {
  window.localStorage.setItem(OVERLAY_KEY, String(enabled))
  window.dispatchEvent(
    new CustomEvent<boolean>(OVERLAY_EVENT, { detail: enabled })
  )
}

const noopPick = async (_options?: AssetPickOptions): Promise<never[]> => []
const noopCache = async (
  _url: string,
  _type: AssetType
): Promise<CacheResult | null> => null

export const createBrowserMockApi = (): FutaeApi => ({
  config: {
    get: async () => readConfig(),
    save: async (next) => writeConfig(next),
    onUpdated: (handler) => {
      const onConfig = (event: Event) => {
        const customEvent = event as CustomEvent<PlayerConfig>
        handler(customEvent.detail)
      }
      const onStorage = (event: StorageEvent) => {
        if (event.key === CONFIG_KEY) {
          handler(readConfig())
        }
      }

      window.addEventListener(CONFIG_EVENT, onConfig)
      window.addEventListener('storage', onStorage)

      return () => {
        window.removeEventListener(CONFIG_EVENT, onConfig)
        window.removeEventListener('storage', onStorage)
      }
    }
  },
  assets: {
    pickFiles: noopPick,
    pickFolder: async () => [],
    cacheRemote: noopCache
  },
  displays: {
    list: async () => readDisplays()
  },
  player: {
    start: async () =>
      writeStatus({
        running: true,
        displayCount: countEnabledDisplays(readConfig(), readDisplays()),
        overlayEnabled: readOverlay()
      }),
    stop: async () =>
      writeStatus({
        running: false,
        displayCount: 0,
        overlayEnabled: readOverlay()
      }),
    status: async () => readStatus(),
    setOverlay: async (enabled: boolean) => {
      writeOverlay(enabled)
      writeStatus({
        ...readStatus(),
        overlayEnabled: enabled
      })
    },
    onOverlay: (handler) => {
      const onOverlay = (event: Event) => {
        const customEvent = event as CustomEvent<boolean>
        handler(customEvent.detail)
      }
      const onStorage = (event: StorageEvent) => {
        if (event.key === OVERLAY_KEY) {
          handler(readOverlay())
        }
      }

      window.addEventListener(OVERLAY_EVENT, onOverlay)
      window.addEventListener('storage', onStorage)

      return () => {
        window.removeEventListener(OVERLAY_EVENT, onOverlay)
        window.removeEventListener('storage', onStorage)
      }
    },
    heartbeat: () => undefined
  },
  utils: {
    toFileUrl: (filePath: string) => filePath
  }
})

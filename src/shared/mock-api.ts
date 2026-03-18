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

let cachedScreenDetails: Promise<WindowManagementScreenDetails | null> | null =
  null

const getDisplayBounds = (screenInfo: WindowManagementDetailedScreen) => ({
  x: screenInfo.left ?? screenInfo.availLeft ?? 0,
  y: screenInfo.top ?? screenInfo.availTop ?? 0,
  width: screenInfo.width,
  height: screenInfo.height
})

const toDisplayId = (
  screenInfo: WindowManagementDetailedScreen,
  index: number
) => {
  const bounds = getDisplayBounds(screenInfo)
  return `display-${index + 1}-${bounds.x}-${bounds.y}-${bounds.width}x${bounds.height}`
}

const toDisplayInfo = (
  screenInfo: WindowManagementDetailedScreen,
  index: number
): DisplayInfo => ({
  id: toDisplayId(screenInfo, index),
  label:
    screenInfo.label?.trim() ||
    (screenInfo.isPrimary ? 'Primary Display' : `Display ${index + 1}`),
  isPrimary: screenInfo.isPrimary === true,
  bounds: getDisplayBounds(screenInfo)
})

const currentDisplayFallback = (): DisplayInfo[] => {
  const currentScreen = window.screen as WindowManagementDetailedScreen

  return [
    {
      id: toDisplayId(currentScreen, 0),
      label: currentScreen.label?.trim() || 'Current Display',
      isPrimary: currentScreen.isPrimary ?? true,
      bounds: getDisplayBounds(currentScreen)
    }
  ]
}

const getScreenDetails =
  async (): Promise<WindowManagementScreenDetails | null> => {
    if (typeof window.getScreenDetails !== 'function') {
      return null
    }

    cachedScreenDetails ??= window.getScreenDetails().catch(() => null)
    return cachedScreenDetails
  }

const readDisplays = async (): Promise<DisplayInfo[]> => {
  const screenDetails = await getScreenDetails()
  if (screenDetails && screenDetails.screens.length > 0) {
    return screenDetails.screens.map((screenInfo, index) =>
      toDisplayInfo(screenInfo, index)
    )
  }

  return currentDisplayFallback()
}

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

const readConfig = async (): Promise<PlayerConfig> => {
  const stored = window.localStorage.getItem(CONFIG_KEY)
  const config = stored
    ? coerceConfig(JSON.parse(stored))
    : createDefaultConfig()
  return ensureDisplayConfigs(config, await readDisplays())
}

const writeConfig = async (config: PlayerConfig): Promise<PlayerConfig> => {
  const displays = await readDisplays()
  const normalized = ensureDisplayConfigs(coerceConfig(config), displays)
  window.localStorage.setItem(CONFIG_KEY, JSON.stringify(normalized))
  window.dispatchEvent(
    new CustomEvent<PlayerConfig>(CONFIG_EVENT, { detail: normalized })
  )

  const status = readStatus()
  if (status.running) {
    writeStatus({
      running: true,
      displayCount: countEnabledDisplays(normalized, displays),
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

export const createBrowserMockApi = (): FutaeApi => {
  cachedScreenDetails = null

  return {
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
            void readConfig().then(handler)
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
      list: async () => readDisplays(),
      onChanged: (handler) => {
        let disposed = false
        let screenDetails: WindowManagementScreenDetails | null = null

        const emit = async () => {
          handler(await readDisplays())
        }

        void getScreenDetails().then((details) => {
          if (!details || disposed) {
            return
          }

          screenDetails = details
          details.addEventListener('screenschange', emit)
          details.addEventListener('currentscreenchange', emit)
        })

        return () => {
          disposed = true
          screenDetails?.removeEventListener('screenschange', emit)
          screenDetails?.removeEventListener('currentscreenchange', emit)
        }
      }
    },
    player: {
      start: async () => {
        const displays = await readDisplays()
        return writeStatus({
          running: true,
          displayCount: countEnabledDisplays(await readConfig(), displays),
          overlayEnabled: readOverlay()
        })
      },
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
  }
}

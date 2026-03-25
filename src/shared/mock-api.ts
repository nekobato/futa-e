import type {
  AssetType,
  CacheResult,
  DisplayInfo,
  PickedAsset,
  PlayerConfig,
  PlayerStatus
} from './types'
import type { AssetPickOptions, FutaeApi } from './ipc'
import { coerceConfig, createDefaultConfig } from './defaults'
import { inferAssetTypeFromPath } from './picked-assets'
import { countEnabledDisplays, ensureDisplayConfigs } from './player-config'

const CONFIG_KEY = 'futae:mock:config'
const STATUS_KEY = 'futae:mock:status'

const CONFIG_EVENT = 'futae:mock:config'
let cachedScreenDetails: Promise<WindowManagementScreenDetails | null> | null =
  null

const inferAssetTypeFromFile = (file: File): AssetType | null => {
  if (file.type.startsWith('image/')) {
    return 'image'
  }

  if (file.type.startsWith('video/')) {
    return 'video'
  }

  return inferAssetTypeFromPath(file.name)
}

const isAllowedAssetType = (
  type: AssetType | null,
  kind: AssetPickOptions['kind']
): type is 'image' | 'video' => {
  if (!type) {
    return false
  }

  if (!kind || kind === 'media') {
    return true
  }

  return type === kind
}

const toPickedAsset = (
  file: File,
  kind: AssetPickOptions['kind']
): PickedAsset | null => {
  const type = inferAssetTypeFromFile(file)
  if (!isAllowedAssetType(type, kind)) {
    return null
  }

  return {
    path: URL.createObjectURL(file),
    type,
    name: file.name
  }
}

const browserPickFiles = async (
  options?: AssetPickOptions
): Promise<PickedAsset[]> =>
  new Promise((resolve) => {
    const input = document.createElement('input')
    const accept =
      options?.kind === 'image'
        ? 'image/*'
        : options?.kind === 'video'
          ? 'video/*'
          : 'image/*,video/*'
    let settled = false

    input.type = 'file'
    input.multiple = true
    input.accept = accept
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    input.style.opacity = '0'

    const finish = (picked: PickedAsset[]) => {
      if (settled) {
        return
      }

      settled = true
      window.removeEventListener('focus', handleFocus)
      input.removeEventListener('change', handleChange)
      input.remove()
      resolve(picked)
    }

    const handleChange = () => {
      const picked = Array.from(input.files ?? [])
        .map((file) => toPickedAsset(file, options?.kind))
        .filter((asset): asset is PickedAsset => Boolean(asset))
      finish(picked)
    }

    const handleFocus = () => {
      window.setTimeout(() => {
        if ((input.files?.length ?? 0) === 0) {
          finish([])
        }
      }, 0)
    }

    input.addEventListener('change', handleChange)
    window.addEventListener('focus', handleFocus)
    document.body.appendChild(input)
    input.click()
  })

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

const readStatus = (): PlayerStatus => {
  const stored = window.localStorage.getItem(STATUS_KEY)
  if (!stored) {
    return { running: false, displayCount: 0 }
  }

  try {
    return JSON.parse(stored) as PlayerStatus
  } catch {
    return { running: false, displayCount: 0 }
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
      displayCount: countEnabledDisplays(normalized, displays)
    })
  }

  return normalized
}

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
      pickFiles: browserPickFiles,
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
          displayCount: countEnabledDisplays(await readConfig(), displays)
        })
      },
      stop: async () =>
        writeStatus({
          running: false,
          displayCount: 0
        }),
      status: async () => readStatus(),
      heartbeat: () => undefined
    },
    utils: {
      toFileUrl: (filePath: string) => filePath
    }
  }
}

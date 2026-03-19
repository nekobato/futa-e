import { app, BrowserWindow, dialog, ipcMain, screen } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, extname, join } from 'node:path'
import { promises as fs } from 'node:fs'
import type {
  AssetType,
  CacheResult,
  DisplayInfo,
  PickedAsset,
  PlayerConfig,
  PlayerStatus
} from '../src/shared/types'
import { coerceConfig, createDefaultConfig } from '../src/shared/defaults'
import {
  getActivePlaylist,
  isPerDisplayPlaylist
} from '../src/shared/player-config'
import { loadConfig, saveConfig } from './config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.svg'
])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.mkv', '.avi'])

let controlWindow: BrowserWindow | null = null
let playerWindows: BrowserWindow[] = []
let currentConfig: PlayerConfig = createDefaultConfig()
const heartbeatMap = new Map<number, number>()
let heartbeatInterval: NodeJS.Timeout | null = null

const getPreloadPath = () => join(__dirname, '../preload/index.js')

const getRendererUrl = (
  view: string,
  params: Record<string, string> = {}
): string => {
  const base =
    process.env.VITE_DEV_SERVER_URL ??
    pathToFileURL(join(app.getAppPath(), 'dist/index.html')).toString()
  const search = new URLSearchParams({ view, ...params }).toString()
  return `${base}?${search}`
}

const inferAssetType = (filePath: string): AssetType | null => {
  const ext = extname(filePath).toLowerCase()
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  return null
}

const pickFiles = async (
  kind: 'image' | 'video' | 'media' = 'media'
): Promise<PickedAsset[]> => {
  const filters = [] as { name: string; extensions: string[] }[]
  if (kind === 'image' || kind === 'media') {
    filters.push({
      name: 'Images',
      extensions: Array.from(IMAGE_EXTENSIONS).map((ext) => ext.slice(1))
    })
  }
  if (kind === 'video' || kind === 'media') {
    filters.push({
      name: 'Videos',
      extensions: Array.from(VIDEO_EXTENSIONS).map((ext) => ext.slice(1))
    })
  }

  const dialogOptions = {
    properties: [
      'openFile',
      'multiSelections'
    ] as Electron.OpenDialogOptions['properties'],
    filters
  }
  const result = controlWindow
    ? await dialog.showOpenDialog(controlWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)

  if (result.canceled) {
    return []
  }

  return result.filePaths
    .map((path) => {
      const type = inferAssetType(path)
      return type ? { path, type } : null
    })
    .filter((asset): asset is PickedAsset => Boolean(asset))
}

const pickFolder = async (): Promise<PickedAsset[]> => {
  const dialogOptions = {
    properties: ['openDirectory'] as Electron.OpenDialogOptions['properties']
  }
  const result = controlWindow
    ? await dialog.showOpenDialog(controlWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)

  if (result.canceled || result.filePaths.length === 0) {
    return []
  }

  const folderPath = result.filePaths[0]
  const entries = await fs.readdir(folderPath, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(folderPath, entry.name))
    .map((path) => {
      const type = inferAssetType(path)
      return type ? { path, type } : null
    })
    .filter((asset): asset is PickedAsset => Boolean(asset))
}

const downloadToFile = async (
  url: string,
  targetPath: string
): Promise<void> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`download failed: ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  await fs.writeFile(targetPath, buffer)
}

const cacheRemoteAsset = async (
  url: string,
  type: AssetType
): Promise<CacheResult | null> => {
  if (type === 'web') {
    return null
  }

  const parsed = new URL(url)
  const ext = extname(parsed.pathname)
  if (!ext) {
    return null
  }

  const cacheDir = join(app.getPath('userData'), 'cache')
  await fs.mkdir(cacheDir, { recursive: true })

  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
  const localPath = join(cacheDir, fileName)

  try {
    await downloadToFile(url, localPath)
    return { localPath, originalUrl: url }
  } catch {
    return null
  }
}

const broadcastConfig = (config: PlayerConfig) => {
  playerWindows.forEach((win) => {
    win.webContents.send('config:updated', config)
  })
}

const broadcastDisplays = () => {
  const displays = listDisplays()

  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send('displays:changed', displays)
  }
}

const startHeartbeatMonitor = () => {
  if (heartbeatInterval) {
    return
  }
  heartbeatInterval = setInterval(() => {
    const now = Date.now()
    playerWindows.forEach((win) => {
      const last = heartbeatMap.get(win.webContents.id) ?? 0
      if (last > 0 && now - last > 15000) {
        win.reload()
      }
    })
  }, 5000)
}

const stopHeartbeatMonitor = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
  heartbeatMap.clear()
}

const createWindow = (
  view: string,
  options: Electron.BrowserWindowConstructorOptions,
  params: Record<string, string> = {}
) => {
  const win = new BrowserWindow({
    ...options,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.loadURL(getRendererUrl(view, params))
  return win
}

const listDisplays = (): DisplayInfo[] => {
  const primaryDisplayId = screen.getPrimaryDisplay().id

  return screen.getAllDisplays().map((display) => ({
    id: String(display.id),
    label: display.label?.trim() || `Display ${display.id}`,
    isPrimary: display.id === primaryDisplayId,
    bounds: {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height
    }
  }))
}

const createControlWindow = () => {
  controlWindow = createWindow('control', {
    width: 1200,
    height: 800,
    minWidth: 980,
    minHeight: 720,
    title: 'Futa-e Player'
  })

  controlWindow.on('closed', () => {
    controlWindow = null
  })
}

const createPlayerWindows = () => {
  const activePlaylist = getActivePlaylist(currentConfig)
  const displays = isPerDisplayPlaylist(activePlaylist)
    ? screen
        .getAllDisplays()
        .filter(
          (display) =>
            currentConfig.displays[String(display.id)]?.enabled !== false
        )
    : screen.getAllDisplays()

  playerWindows = displays.map((display) => {
    const win = createWindow(
      'player',
      {
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        fullscreen: true,
        frame: false,
        backgroundColor: '#000000',
        show: true
      },
      {
        displayId: String(display.id)
      }
    )

    win.setMenuBarVisibility(false)
    win.on('closed', () => {
      playerWindows = playerWindows.filter((item) => item !== win)
      if (playerWindows.length === 0) {
        stopHeartbeatMonitor()
      }
    })

    win.webContents.on('render-process-gone', () => {
      win.reload()
    })

    win.webContents.once('did-finish-load', () => {
      win.webContents.send('config:updated', currentConfig)
    })

    win.webContents.on('unresponsive', () => {
      win.reload()
    })

    win.webContents.on('responsive', () => {
      heartbeatMap.set(win.webContents.id, Date.now())
    })

    heartbeatMap.set(win.webContents.id, Date.now())

    return win
  })

  startHeartbeatMonitor()
}

const closePlayerWindows = () => {
  playerWindows.forEach((win) => win.close())
  playerWindows = []
  stopHeartbeatMonitor()
}

const getStatus = (): PlayerStatus => ({
  running: playerWindows.length > 0,
  displayCount: playerWindows.length
})

const updateConfig = async (next: PlayerConfig): Promise<PlayerConfig> => {
  const normalized = coerceConfig(next)
  currentConfig = await saveConfig(normalized)

  if (playerWindows.length > 0) {
    closePlayerWindows()
    createPlayerWindows()
  }

  broadcastConfig(currentConfig)
  return currentConfig
}

app.whenReady().then(async () => {
  currentConfig = await loadConfig()

  createControlWindow()

  screen.on('display-added', broadcastDisplays)
  screen.on('display-removed', broadcastDisplays)
  screen.on('display-metrics-changed', broadcastDisplays)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!controlWindow) {
    createControlWindow()
  }
})

app.on('will-quit', () => {
  screen.removeListener('display-added', broadcastDisplays)
  screen.removeListener('display-removed', broadcastDisplays)
  screen.removeListener('display-metrics-changed', broadcastDisplays)
})

ipcMain.handle('config:get', () => currentConfig)

ipcMain.handle('config:save', async (_event, next: PlayerConfig) =>
  updateConfig(next)
)

ipcMain.handle(
  'assets:pick-files',
  async (_event, options?: { kind?: 'image' | 'video' | 'media' }) =>
    pickFiles(options?.kind ?? 'media')
)

ipcMain.handle('assets:pick-folder', async () => pickFolder())

ipcMain.handle(
  'assets:cache-remote',
  async (_event, payload: { url: string; type: AssetType }) =>
    cacheRemoteAsset(payload.url, payload.type)
)

ipcMain.handle('displays:list', async () => listDisplays())

ipcMain.handle('player:start', async () => {
  if (playerWindows.length === 0) {
    createPlayerWindows()
    broadcastConfig(currentConfig)
  }
  return getStatus()
})

ipcMain.handle('player:stop', async () => {
  closePlayerWindows()
  return getStatus()
})

ipcMain.handle('player:status', async () => getStatus())

ipcMain.on('player:heartbeat', (event) => {
  heartbeatMap.set(event.sender.id, Date.now())
})

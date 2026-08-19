import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  net,
  protocol,
  screen,
  Tray,
  type Display
} from 'electron'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import type {
  DisplayInfo,
  PickedAsset,
  PlayerConfig,
  PlayerStatus
} from '../src/shared/types'
import { coerceConfig, createDefaultConfig } from '../src/shared/defaults'
import { filterPlaybackDisplays } from '../src/shared/player-config'
import { dialogExtensionsForKind } from '../src/shared/picked-assets'
import {
  getConfigDiagnostics,
  loadConfig,
  loadPlaybackConfig,
  saveConfig
} from './config'
import {
  createPlayerExitShortcutDetector,
  shouldBlockPlayerWindowEscape
} from './player-window-input'
import { createLaunchAtLoginController } from './login-item'
import { createKioskExitShortcutController } from './kiosk-exit-shortcut'
import {
  planPlayerWindowReconciliation,
  selectPlayerTargetDisplays
} from './player-window-reconciliation'
import {
  applyPlayerWindowPresentation,
  restorePlayerWindowPresentation
} from './player-window'
import {
  DEEP_LINK_SCHEME,
  findDeepLinkArg,
  parseDeepLink,
  type DeepLinkCommand
} from './deep-link'
import { collectAllowedLocalAssets } from './local-asset-config'
import { getLocalAssetRegistry } from './local-assets'
import { createLocalMediaProtocolHandler } from './local-media-protocol'
import { parseKioskExitShortcutInput } from '../src/shared/kiosk-exit-shortcut'

const APP_NAME = 'Futa E'
const LOCAL_MEDIA_SCHEME = 'futae-media'
const DISPLAY_CHANGE_DEBOUNCE_MS = 300

app.setName(APP_NAME)
const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) {
  app.quit()
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: LOCAL_MEDIA_SCHEME,
    privileges: {
      secure: true,
      standard: true,
      stream: true
    }
  }
])

let controlWindow: BrowserWindow | null = null
const playerWindows = new Map<string, BrowserWindow>()
let playerModeActive = false
let playerModeInitialDisplayIds = new Set<string>()
let statusTray: Tray | null = null
let editableConfig: PlayerConfig = createDefaultConfig()
let playbackConfig: PlayerConfig = createDefaultConfig()
const heartbeatMap = new Map<number, number>()
let heartbeatInterval: NodeJS.Timeout | null = null
let displayChangeTimer: NodeJS.Timeout | null = null
let playerWindowReconcileTask: Promise<void> = Promise.resolve()
const pendingRecreateDisplayIds = new Set<string>()
let deepLinksReady = false
const queuedDeepLinkCommands: DeepLinkCommand[] = []
let closePlayerWindowsTask: Promise<void> | null = null
const launchAtLoginController = createLaunchAtLoginController(app)
const kioskExitShortcutController = createKioskExitShortcutController(
  globalShortcut,
  () => {
    if (playerModeActive) {
      void exitPlayerMode()
    }
  }
)

/** Returns the bundled preload script path from the current application root. */
const getPreloadPath = () =>
  join(app.getAppPath(), 'dist-electron', 'preload.js')

/** Returns the project-local PNG used for Electron window and dock icons. */
const getAppIconPath = () => join(app.getAppPath(), 'resources', 'app-icon.png')

/** Returns the project-local PNG used for the macOS menu bar template icon. */
const getTrayIconPath = () =>
  join(app.getAppPath(), 'resources', 'tray-iconTemplate.png')

/** Loads the application icon when the generated asset is available. */
const getAppIcon = (): Electron.NativeImage | undefined => {
  const iconPath = getAppIconPath()
  if (!existsSync(iconPath)) {
    return undefined
  }

  const icon = nativeImage.createFromPath(iconPath)
  return icon.isEmpty() ? undefined : icon
}

/** Loads the menu bar icon and marks it as a macOS template image. */
const getTrayIcon = (): Electron.NativeImage | undefined => {
  const trayIconPath = getTrayIconPath()
  if (!existsSync(trayIconPath)) {
    return getAppIcon()
  }

  const icon = nativeImage.createFromPath(trayIconPath)
  if (icon.isEmpty()) {
    return getAppIcon()
  }

  if (process.platform === 'darwin') {
    icon.setTemplateImage(true)
  }

  return icon
}

/** Applies the generated icon to macOS Dock where window icons are ignored. */
const applyDockIcon = () => {
  const icon = getAppIcon()
  if (process.platform === 'darwin' && icon) {
    app.dock?.setIcon(icon)
  }
}

/** Registers the packaged app as the handler for futa-e:// deep links. */
const registerDeepLinkProtocol = () => {
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME)
  }
}

/**
 * Registers the protocol handler used to stream local media files in Electron.
 */
const registerLocalMediaProtocol = () => {
  if (protocol.isProtocolHandled(LOCAL_MEDIA_SCHEME)) {
    return
  }

  const registry = getLocalAssetRegistry()
  protocol.handle(
    LOCAL_MEDIA_SCHEME,
    createLocalMediaProtocolHandler({
      getAllowedType: (assetId) =>
        collectAllowedLocalAssets(playbackConfig).get(assetId) ?? null,
      resolve: (assetId, type) => registry.resolve(assetId, type),
      fetchFile: (url, init) => net.fetch(url, init)
    })
  )
}

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

const pickFiles = async (
  kind: 'image' | 'video' | 'media' = 'media'
): Promise<PickedAsset[]> => {
  const filters = [] as { name: string; extensions: string[] }[]
  if (kind === 'image' || kind === 'media') {
    filters.push({
      name: 'Images',
      extensions: dialogExtensionsForKind('image').map((ext) => ext.slice(1))
    })
  }
  if (kind === 'video' || kind === 'media') {
    filters.push({
      name: 'Videos',
      extensions: dialogExtensionsForKind('video').map((ext) => ext.slice(1))
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

  const registry = getLocalAssetRegistry()
  const assets: PickedAsset[] = []
  for (const filePath of result.filePaths) {
    const asset = await registry.register(filePath, kind)
    if (asset) {
      assets.push(asset)
    }
  }

  return assets
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

/** Debounces display changes and reconciles Kiosk windows when active. */
const scheduleDisplayReconciliation = (recreateDisplayId?: string) => {
  if (recreateDisplayId) {
    pendingRecreateDisplayIds.add(recreateDisplayId)
  }

  if (displayChangeTimer) {
    clearTimeout(displayChangeTimer)
  }

  displayChangeTimer = setTimeout(() => {
    displayChangeTimer = null
    const recreateDisplayIds = new Set(pendingRecreateDisplayIds)
    pendingRecreateDisplayIds.clear()
    broadcastDisplays()

    if (playerModeActive) {
      void queuePlayerWindowReconciliation(recreateDisplayIds)
    }
  }, DISPLAY_CHANGE_DEBOUNCE_MS)
}

/** Repositions existing Kiosk windows after a display topology change. */
const handleDisplayTopologyChanged = () => {
  playerWindows.forEach((_win, displayId) => {
    pendingRecreateDisplayIds.add(displayId)
  })
  scheduleDisplayReconciliation()
}

/** Recreates the affected Kiosk window after display metrics change. */
const handleDisplayMetricsChanged = (
  _event: Electron.Event,
  display: Display
) => {
  scheduleDisplayReconciliation(String(display.id))
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
        if (!win.isDestroyed()) {
          win.reload()
        }
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
  const icon = getAppIcon()
  const win = new BrowserWindow({
    ...(icon ? { icon } : {}),
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
    width: 1180,
    height: 760,
    minWidth: 800,
    minHeight: 600,
    title: APP_NAME
  })

  controlWindow.on('closed', () => {
    controlWindow = null
  })
}

const createPlayerWindow = (display: Display): BrowserWindow => {
  const displayId = String(display.id)
  const shouldExitPlayerWindows = createPlayerExitShortcutDetector()

  const win = createWindow(
    'player',
    {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      show: false,
      frame: false,
      kiosk: true,
      fullscreenable: false,
      autoHideMenuBar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      backgroundColor: '#000000',
      alwaysOnTop: true,
      roundedCorners: false
    },
    {
      displayId
    }
  )

  const webContentsId = win.webContents.id
  playerWindows.set(displayId, win)
  win.setMenuBarVisibility(false)
  win.on('closed', () => {
    if (playerWindows.get(displayId) === win) {
      playerWindows.delete(displayId)
    }
    heartbeatMap.delete(webContentsId)
    if (playerWindows.size === 0) {
      stopHeartbeatMonitor()
    }
    updateStatusTrayMenu()
  })

  win.webContents.on('render-process-gone', () => {
    if (!win.isDestroyed()) {
      win.reload()
    }
  })

  win.webContents.once('did-finish-load', () => {
    win.webContents.send('config:updated', playbackConfig)
  })

  win.webContents.on('before-input-event', (event, input) => {
    if (!shouldBlockPlayerWindowEscape(input)) {
      return
    }

    event.preventDefault()
    if (shouldExitPlayerWindows(input)) {
      void exitPlayerMode()
    }
  })

  win.once('ready-to-show', () => {
    applyPlayerWindowPresentation(win)
  })

  win.webContents.on('unresponsive', () => {
    if (!win.isDestroyed()) {
      win.reload()
    }
  })

  win.webContents.on('responsive', () => {
    heartbeatMap.set(win.webContents.id, Date.now())
  })

  heartbeatMap.set(win.webContents.id, Date.now())

  return win
}

/** Resolves once Electron has emitted a closed event for the target window. */
const waitForWindowClosed = (win: BrowserWindow): Promise<void> => {
  if (win.isDestroyed()) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    win.once('closed', resolve)
    win.close()
  })
}

/** Restores presentation state and closes a player window. */
const closePlayerWindow = async (win: BrowserWindow): Promise<void> => {
  if (win.isDestroyed()) {
    return
  }

  await restorePlayerWindowPresentation(win)
  await waitForWindowClosed(win)
}

/**
 * Reconciles Player windows against the current connected and enabled displays.
 */
const reconcilePlayerWindows = async (
  recreateDisplayIds: ReadonlySet<string> = new Set()
): Promise<void> => {
  if (!playerModeActive) {
    return
  }

  const displays = filterPlaybackDisplays(
    playbackConfig,
    selectPlayerTargetDisplays(
      playbackConfig,
      screen.getAllDisplays(),
      playerModeInitialDisplayIds
    )
  )
  const displaysById = new Map(
    displays.map((display) => [String(display.id), display])
  )
  const plan = planPlayerWindowReconciliation({
    desiredDisplayIds: [...displaysById.keys()],
    existingDisplayIds: [...playerWindows.keys()],
    recreateDisplayIds
  })

  await Promise.all(
    plan.closeDisplayIds.map(async (displayId) => {
      const win = playerWindows.get(displayId)
      if (win) {
        await closePlayerWindow(win)
      }
    })
  )

  if (!playerModeActive) {
    return
  }

  plan.createDisplayIds.forEach((displayId) => {
    const display = displaysById.get(displayId)
    if (display && !playerWindows.has(displayId)) {
      createPlayerWindow(display)
    }
  })

  if (playerWindows.size > 0) {
    startHeartbeatMonitor()
  } else {
    stopHeartbeatMonitor()
  }

  updateStatusTrayMenu()
}

/**
 * Serializes Player-window reconciliation so hot-plug bursts cannot overlap.
 */
const queuePlayerWindowReconciliation = (
  recreateDisplayIds: ReadonlySet<string> = new Set()
): Promise<void> => {
  const requestedRecreateIds = new Set(recreateDisplayIds)

  playerWindowReconcileTask = playerWindowReconcileTask
    .catch((error) => {
      console.error('Failed to reconcile Player windows.', error)
    })
    .then(() => reconcilePlayerWindows(requestedRecreateIds))

  return playerWindowReconcileTask
}

/** Closes every player window after leaving kiosk presentation mode. */
const closePlayerWindows = async (): Promise<void> => {
  if (closePlayerWindowsTask) {
    return closePlayerWindowsTask
  }

  const windows = [...playerWindows.values()]
  playerWindows.clear()
  stopHeartbeatMonitor()
  updateStatusTrayMenu()

  closePlayerWindowsTask = Promise.all(windows.map(closePlayerWindow)).then(
    () => undefined
  )

  try {
    await closePlayerWindowsTask
  } finally {
    closePlayerWindowsTask = null
    updateStatusTrayMenu()
  }
}

const restoreControlWindow = () => {
  if (!controlWindow || controlWindow.isDestroyed()) {
    createControlWindow()
    return
  }

  if (controlWindow.isMinimized()) {
    controlWindow.restore()
  }

  controlWindow.show()
  controlWindow.focus()
  controlWindow.moveTop()
}

async function exitPlayerMode() {
  playerModeActive = false
  playerModeInitialDisplayIds.clear()
  await playerWindowReconcileTask.catch((error) => {
    console.error('Failed to finish Player-window reconciliation.', error)
  })
  await closePlayerWindows()
  restoreControlWindow()
}

const getStatus = (): PlayerStatus => ({
  running: playerModeActive,
  displayCount: playerWindows.size
})

/** Starts player windows if kiosk mode is not already running. */
const startPlayerMode = async (): Promise<PlayerStatus> => {
  if (closePlayerWindowsTask) {
    await closePlayerWindowsTask
  }

  if (!playerModeActive) {
    playbackConfig = await loadPlaybackConfig()
    playerModeActive = true
    playerModeInitialDisplayIds = new Set(
      screen.getAllDisplays().map((display) => String(display.id))
    )
    console.log('Starting player windows...')
    await queuePlayerWindowReconciliation()
    broadcastConfig(playbackConfig)
    updateStatusTrayMenu()
  }

  return getStatus()
}

/** Refreshes the menu bar status menu from the current player state. */
const updateStatusTrayMenu = () => {
  if (!statusTray) {
    return
  }

  const isRunning = playerModeActive
  const displayCount = playerWindows.size
  statusTray.setToolTip(
    isRunning
      ? displayCount > 0
        ? `${APP_NAME} - Kiosk running on ${displayCount} display(s)`
        : `${APP_NAME} - Kiosk waiting for an enabled display`
      : `${APP_NAME} - Kiosk ready`
  )
  statusTray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: isRunning ? 'Kioskを停止' : 'Kioskを開始',
        click: () => {
          if (isRunning) {
            void exitPlayerMode()
            return
          }

          void startPlayerMode()
        }
      },
      {
        label: '操作画面を表示',
        click: restoreControlWindow
      },
      { type: 'separator' },
      {
        label: 'Futa Eを終了',
        role: 'quit'
      }
    ])
  )
}

/** Creates the macOS menu bar entry for quick kiosk control. */
const createStatusTray = () => {
  if (statusTray) {
    return
  }

  const icon = getTrayIcon()
  if (!icon || icon.isEmpty()) {
    return
  }

  statusTray = new Tray(icon)
  updateStatusTrayMenu()
}

/** Runs an already parsed deep-link command against the current app state. */
const runDeepLinkCommand = async (command: DeepLinkCommand) => {
  if (command === 'start-player') {
    await startPlayerMode()
    return
  }
  if (command === 'stop-player') {
    await exitPlayerMode()
    return
  }

  restoreControlWindow()
}

/** Queues deep-link commands until the app has loaded configuration. */
const dispatchDeepLinkCommand = (command: DeepLinkCommand) => {
  if (!deepLinksReady) {
    queuedDeepLinkCommands.push(command)
    return
  }

  void runDeepLinkCommand(command)
}

/** Parses and dispatches a raw futa-e:// URL. */
const handleDeepLinkUrl = (rawUrl: string) => {
  const command = parseDeepLink(rawUrl)
  if (!command) {
    return
  }

  dispatchDeepLinkCommand(command)
}

/** Replays deep links captured before Electron finished initialization. */
const flushQueuedDeepLinkCommands = () => {
  const commands = [...queuedDeepLinkCommands]
  queuedDeepLinkCommands.length = 0
  commands.forEach(dispatchDeepLinkCommand)
}

const createKioskExitShortcutError = (
  reason: 'invalid' | 'unavailable'
): Error =>
  new Error(
    reason === 'invalid'
      ? 'Kiosk終了ショートカットの書式が正しくありません。'
      : 'Kiosk終了ショートカットはほかのアプリで使用されています。'
  )

const updateConfig = async (
  next: PlayerConfig,
  {
    forceKioskExitShortcutRegistration = false
  }: {
    forceKioskExitShortcutRegistration?: boolean
  } = {}
): Promise<PlayerConfig> => {
  const normalized = coerceConfig(next)
  const previousActiveAccelerator =
    kioskExitShortcutController.getActiveAccelerator()
  const shouldRegisterShortcut =
    forceKioskExitShortcutRegistration ||
    normalized.kioskExitShortcut !== editableConfig.kioskExitShortcut

  if (shouldRegisterShortcut) {
    const result = kioskExitShortcutController.set(normalized.kioskExitShortcut)
    if (!result.ok) {
      throw createKioskExitShortcutError(result.reason)
    }
  }

  try {
    editableConfig = await saveConfig(normalized)
  } catch (error) {
    if (shouldRegisterShortcut) {
      if (previousActiveAccelerator) {
        const rollbackResult = kioskExitShortcutController.set(
          previousActiveAccelerator
        )
        if (!rollbackResult.ok) {
          console.error(
            'Failed to restore the previous Kiosk exit shortcut.',
            rollbackResult.reason
          )
        }
      } else {
        kioskExitShortcutController.deactivate()
      }
    }
    throw error
  }

  playbackConfig = await loadPlaybackConfig()

  if (playerModeActive) {
    await queuePlayerWindowReconciliation()
  }

  broadcastConfig(playbackConfig)
  return editableConfig
}

app.on('open-url', (event, rawUrl) => {
  event.preventDefault()
  handleDeepLinkUrl(rawUrl)
})

if (hasSingleInstanceLock) {
  app.on('second-instance', (_event, commandLine) => {
    const rawUrl = findDeepLinkArg(commandLine)
    if (rawUrl) {
      handleDeepLinkUrl(rawUrl)
      return
    }

    restoreControlWindow()
  })

  app.whenReady().then(async () => {
    applyDockIcon()
    registerLocalMediaProtocol()
    registerDeepLinkProtocol()
    editableConfig = await loadConfig()
    playbackConfig = await loadPlaybackConfig()

    const shortcutResult = kioskExitShortcutController.set(
      editableConfig.kioskExitShortcut
    )
    if (!shortcutResult.ok) {
      console.error(
        'Failed to register the configured Kiosk exit shortcut.',
        shortcutResult.reason
      )
    }

    createControlWindow()
    createStatusTray()
    deepLinksReady = true

    const initialDeepLink = findDeepLinkArg(process.argv)
    if (initialDeepLink) {
      handleDeepLinkUrl(initialDeepLink)
    }
    flushQueuedDeepLinkCommands()

    screen.on('display-added', handleDisplayTopologyChanged)
    screen.on('display-removed', handleDisplayTopologyChanged)
    screen.on('display-metrics-changed', handleDisplayMetricsChanged)
  })
}

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
  playerModeActive = false
  kioskExitShortcutController.deactivate()
  if (displayChangeTimer) {
    clearTimeout(displayChangeTimer)
    displayChangeTimer = null
  }
  pendingRecreateDisplayIds.clear()
  screen.removeListener('display-added', handleDisplayTopologyChanged)
  screen.removeListener('display-removed', handleDisplayTopologyChanged)
  screen.removeListener('display-metrics-changed', handleDisplayMetricsChanged)
  statusTray?.destroy()
  statusTray = null
})

ipcMain.handle('config:get', () => editableConfig)

ipcMain.handle('config:get-diagnostics', async () => getConfigDiagnostics())

ipcMain.handle('config:get-playback', () => playbackConfig)

ipcMain.handle('config:save', async (_event, next: PlayerConfig) =>
  updateConfig(next)
)

ipcMain.handle(
  'assets:pick-files',
  async (_event, options?: { kind?: 'image' | 'video' | 'media' }) =>
    pickFiles(options?.kind ?? 'media')
)

ipcMain.handle('displays:list', async () => listDisplays())

ipcMain.handle('player:start', async () => startPlayerMode())

ipcMain.handle('player:stop', async () => {
  await exitPlayerMode()
  return getStatus()
})

ipcMain.handle('player:status', async () => getStatus())

ipcMain.on('player:heartbeat', (event) => {
  heartbeatMap.set(event.sender.id, Date.now())
})

ipcMain.handle('system:get-launch-at-login', async () =>
  launchAtLoginController.get()
)

ipcMain.handle('system:set-launch-at-login', async (_event, enabled: boolean) =>
  launchAtLoginController.set(enabled)
)

ipcMain.handle('system:get-kiosk-exit-shortcut', async () =>
  kioskExitShortcutController.get(editableConfig.kioskExitShortcut)
)

ipcMain.handle(
  'system:set-kiosk-exit-shortcut',
  async (_event, value: unknown) => {
    const accelerator = parseKioskExitShortcutInput(value)
    if (!accelerator) {
      throw createKioskExitShortcutError('invalid')
    }

    const config = await updateConfig(
      {
        ...editableConfig,
        kioskExitShortcut: accelerator
      },
      { forceKioskExitShortcutRegistration: true }
    )

    return kioskExitShortcutController.get(config.kioskExitShortcut)
  }
)

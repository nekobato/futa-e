import type { BrowserWindow, VisibleOnAllWorkspacesOptions } from 'electron'

type PlayerWindowPresenter = {
  focus: () => void
  moveTop: () => void
  setAlwaysOnTop: (
    flag: boolean,
    level?: Parameters<BrowserWindow['setAlwaysOnTop']>[1],
    relativeLevel?: number
  ) => void
  setFullScreen: (flag: boolean) => void
  setFullScreenable: (flag: boolean) => void
  setKiosk: (flag: boolean) => void
  setVisibleOnAllWorkspaces: (
    visible: boolean,
    options?: VisibleOnAllWorkspacesOptions
  ) => void
  show: () => void
}

type PlayerWindowRestorer = {
  isDestroyed: () => boolean
  isFullScreen: () => boolean
  once: BrowserWindow['once']
  removeListener: BrowserWindow['removeListener']
  setAlwaysOnTop: PlayerWindowPresenter['setAlwaysOnTop']
  setFullScreen: PlayerWindowPresenter['setFullScreen']
  setFullScreenable: PlayerWindowPresenter['setFullScreenable']
  setKiosk: PlayerWindowPresenter['setKiosk']
  setVisibleOnAllWorkspaces: PlayerWindowPresenter['setVisibleOnAllWorkspaces']
}

const macVisibleOnAllWorkspacesOptions: VisibleOnAllWorkspacesOptions = {
  visibleOnFullScreen: true,
  skipTransformProcessType: true
}

const linuxVisibleOnAllWorkspacesOptions: VisibleOnAllWorkspacesOptions = {
  visibleOnFullScreen: true
}

const FULLSCREEN_EXIT_TIMEOUT_MS = 1200

/**
 * Applies the fullscreen, kiosk, and stacking rules required for playback.
 */
export const applyPlayerWindowPresentation = (
  win: PlayerWindowPresenter,
  platform: NodeJS.Platform = process.platform
): void => {
  if (platform === 'darwin') {
    win.setAlwaysOnTop(true, 'screen-saver')
  } else {
    win.setAlwaysOnTop(true)
  }

  win.setFullScreenable(false)
  win.setFullScreen(true)
  win.setKiosk(true)

  if (platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, macVisibleOnAllWorkspacesOptions)
  } else if (platform !== 'win32') {
    win.setVisibleOnAllWorkspaces(true, linuxVisibleOnAllWorkspacesOptions)
  }

  win.show()
  win.focus()
  win.moveTop()
}

/**
 * Resolves after macOS reports that fullscreen has ended, or after a guard
 * timeout when the platform does not emit the event.
 */
const waitForMacFullScreenExit = (
  win: PlayerWindowRestorer,
  platform: NodeJS.Platform,
  timeoutMs = FULLSCREEN_EXIT_TIMEOUT_MS
): Promise<void> => {
  if (platform !== 'darwin' || win.isDestroyed() || !win.isFullScreen()) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    let timeoutId: NodeJS.Timeout | null = null

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      win.removeListener('leave-full-screen', cleanup)
      win.removeListener('closed', cleanup)
      resolve()
    }

    timeoutId = setTimeout(cleanup, timeoutMs)
    win.once('leave-full-screen', cleanup)
    win.once('closed', cleanup)
  })
}

/**
 * Restores window presentation state before the player window is closed.
 */
export const restorePlayerWindowPresentation = async (
  win: PlayerWindowRestorer,
  platform: NodeJS.Platform = process.platform
): Promise<void> => {
  if (win.isDestroyed()) {
    return
  }

  const fullScreenExit = waitForMacFullScreenExit(win, platform)

  win.setKiosk(false)
  win.setFullScreen(false)
  await fullScreenExit

  if (win.isDestroyed()) {
    return
  }

  win.setAlwaysOnTop(false)
  win.setFullScreenable(true)

  if (platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(false)
  } else if (platform !== 'win32') {
    win.setVisibleOnAllWorkspaces(false)
  }
}

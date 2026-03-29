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

const macVisibleOnAllWorkspacesOptions: VisibleOnAllWorkspacesOptions = {
  visibleOnFullScreen: true,
  skipTransformProcessType: true
}

const linuxVisibleOnAllWorkspacesOptions: VisibleOnAllWorkspacesOptions = {
  visibleOnFullScreen: true
}

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

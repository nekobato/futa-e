import { describe, expect, it, vi } from 'vitest'
import {
  applyPlayerWindowPresentation,
  restorePlayerWindowPresentation
} from '../../electron/player-window'

type PlayerWindowRestorer = Parameters<
  typeof restorePlayerWindowPresentation
>[0]

const createPlayerWindowPresenter = () => ({
  focus: vi.fn(),
  moveTop: vi.fn(),
  setAlwaysOnTop: vi.fn(),
  setFullScreen: vi.fn(),
  setFullScreenable: vi.fn(),
  setKiosk: vi.fn(),
  setVisibleOnAllWorkspaces: vi.fn(),
  show: vi.fn()
})

const createPlayerWindowRestorer = (fullScreen = true) => {
  const listeners = new Map<string, () => void>()
  const win = {
    isDestroyed: vi.fn(() => false),
    isFullScreen: vi.fn(() => fullScreen),
    once: vi.fn((event: string, listener: () => void) => {
      listeners.set(event, listener)
      return win
    }),
    removeListener: vi.fn((event: string, listener: () => void) => {
      if (listeners.get(event) === listener) {
        listeners.delete(event)
      }
      return win
    }),
    setAlwaysOnTop: vi.fn(),
    setFullScreen: vi.fn(),
    setFullScreenable: vi.fn(),
    setKiosk: vi.fn(),
    setVisibleOnAllWorkspaces: vi.fn(),
    emit: (event: string) => {
      listeners.get(event)?.()
    }
  }

  return win
}

describe('player window presentation', () => {
  it('raises macOS player windows above the system bar', () => {
    const win = createPlayerWindowPresenter()

    applyPlayerWindowPresentation(win, 'darwin')

    expect(win.setAlwaysOnTop).toHaveBeenCalledWith(true, 'screen-saver')
    expect(win.setFullScreenable).toHaveBeenCalledWith(false)
    expect(win.setFullScreen).toHaveBeenCalledWith(true)
    expect(win.setKiosk).toHaveBeenCalledWith(true)
    expect(win.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true
    })
    expect(win.show).toHaveBeenCalledOnce()
    expect(win.focus).toHaveBeenCalledOnce()
    expect(win.moveTop).toHaveBeenCalledOnce()
  })

  it('keeps Windows player windows fullscreen without workspace pinning', () => {
    const win = createPlayerWindowPresenter()

    applyPlayerWindowPresentation(win, 'win32')

    expect(win.setAlwaysOnTop).toHaveBeenCalledWith(true)
    expect(win.setVisibleOnAllWorkspaces).not.toHaveBeenCalled()
    expect(win.setFullScreen).toHaveBeenCalledWith(true)
    expect(win.setKiosk).toHaveBeenCalledWith(true)
  })

  it('restores macOS player presentation after leaving fullscreen', async () => {
    const win = createPlayerWindowRestorer()

    const restore = restorePlayerWindowPresentation(
      win as unknown as PlayerWindowRestorer,
      'darwin'
    )

    expect(win.setKiosk).toHaveBeenCalledWith(false)
    expect(win.setFullScreen).toHaveBeenCalledWith(false)
    expect(win.setVisibleOnAllWorkspaces).not.toHaveBeenCalled()

    win.emit('leave-full-screen')
    await restore

    expect(win.setAlwaysOnTop).toHaveBeenCalledWith(false)
    expect(win.setFullScreenable).toHaveBeenCalledWith(true)
    expect(win.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(false)
  })

  it('restores Windows player presentation without workspace pinning', async () => {
    const win = createPlayerWindowRestorer()

    await restorePlayerWindowPresentation(
      win as unknown as PlayerWindowRestorer,
      'win32'
    )

    expect(win.setKiosk).toHaveBeenCalledWith(false)
    expect(win.setFullScreen).toHaveBeenCalledWith(false)
    expect(win.setAlwaysOnTop).toHaveBeenCalledWith(false)
    expect(win.setFullScreenable).toHaveBeenCalledWith(true)
    expect(win.setVisibleOnAllWorkspaces).not.toHaveBeenCalled()
  })
})

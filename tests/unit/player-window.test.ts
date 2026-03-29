import { describe, expect, it, vi } from 'vitest'
import { applyPlayerWindowPresentation } from '../../electron/player-window'

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
})

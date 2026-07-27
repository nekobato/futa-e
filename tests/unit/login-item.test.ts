import { describe, expect, it, vi } from 'vitest'
import { createLaunchAtLoginController } from '../../electron/login-item'

describe('launch-at-login controller', () => {
  it('reads and updates the packaged macOS login item', () => {
    let enabled = false
    const electronApp = {
      isPackaged: true,
      getLoginItemSettings: vi.fn(() => ({ openAtLogin: enabled })),
      setLoginItemSettings: vi.fn((settings: Electron.Settings) => {
        enabled = settings.openAtLogin ?? false
      })
    }
    const controller = createLaunchAtLoginController(
      electronApp as never,
      'darwin'
    )

    expect(controller.get()).toEqual({ supported: true, enabled: false })
    expect(controller.set(true)).toEqual({ supported: true, enabled: true })
    expect(electronApp.setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true
    })
  })

  it('does not register a login item outside packaged macOS', () => {
    const electronApp = {
      isPackaged: false,
      getLoginItemSettings: vi.fn(() => ({ openAtLogin: true })),
      setLoginItemSettings: vi.fn()
    }
    const controller = createLaunchAtLoginController(
      electronApp as never,
      'darwin'
    )

    expect(controller.set(true)).toEqual({ supported: false, enabled: false })
    expect(electronApp.setLoginItemSettings).not.toHaveBeenCalled()
  })
})

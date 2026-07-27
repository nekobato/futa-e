import type { App } from 'electron'
import type { LaunchAtLoginSettings } from '../src/shared/ipc'

type LoginItemApp = Pick<
  App,
  'getLoginItemSettings' | 'setLoginItemSettings'
> & {
  readonly isPackaged: boolean
}

export type LaunchAtLoginController = {
  get: () => LaunchAtLoginSettings
  set: (enabled: boolean) => LaunchAtLoginSettings
}

/**
 * Creates the macOS login-item controller used by the main process.
 */
export const createLaunchAtLoginController = (
  electronApp: LoginItemApp,
  platform: NodeJS.Platform = process.platform
): LaunchAtLoginController => {
  const isSupported = () => platform === 'darwin' && electronApp.isPackaged

  const get = (): LaunchAtLoginSettings => ({
    supported: isSupported(),
    enabled: isSupported()
      ? electronApp.getLoginItemSettings().openAtLogin
      : false
  })

  const set = (enabled: boolean): LaunchAtLoginSettings => {
    if (isSupported()) {
      electronApp.setLoginItemSettings({ openAtLogin: enabled })
    }

    return get()
  }

  return { get, set }
}

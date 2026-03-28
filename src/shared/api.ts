import type { FutaeApi } from './ipc'
import { createBrowserMockApi } from './mock-api'

let cachedApi: FutaeApi | null = null

/** Returns true when the renderer is hosted by Electron but preload injection failed. */
const isElectronShell = (): boolean =>
  window.location.protocol === 'file:' ||
  window.navigator.userAgent.includes('Electron/')

export const getFutaeApi = (): FutaeApi => {
  if (cachedApi) {
    return cachedApi
  }

  if (!window.futae && isElectronShell()) {
    console.warn(
      'Futa-e preload bridge was not injected. Falling back to the browser mock API.'
    )
  }

  cachedApi = window.futae ?? createBrowserMockApi()
  return cachedApi
}

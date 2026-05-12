import type { FutaeApi } from './ipc'

let cachedApi: FutaeApi | null = null

/** Returns the Electron preload bridge or fails when it is unavailable. */
const requirePreloadApi = (): FutaeApi => {
  if (!window.futae) {
    throw new Error('Futa-e preload bridge was not injected.')
  }

  return window.futae
}

/** Returns the application API exposed by the Electron preload bridge. */
export const getFutaeApi = (): FutaeApi => {
  if (cachedApi) {
    return cachedApi
  }

  cachedApi = requirePreloadApi()
  return cachedApi
}

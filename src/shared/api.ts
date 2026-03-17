import type { FutaeApi } from './ipc'
import { createBrowserMockApi } from './mock-api'

let cachedApi: FutaeApi | null = null

export const getFutaeApi = (): FutaeApi => {
  if (cachedApi) {
    return cachedApi
  }

  cachedApi = window.futae ?? createBrowserMockApi()
  return cachedApi
}

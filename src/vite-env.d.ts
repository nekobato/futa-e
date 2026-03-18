/// <reference types="vite/client" />

import type { FutaeApi } from './shared/ipc'

declare global {
  interface WindowManagementDetailedScreen extends Screen {
    availLeft?: number
    availTop?: number
    isPrimary?: boolean
    label?: string
    left?: number
    top?: number
  }

  interface WindowManagementScreenDetails extends EventTarget {
    currentScreen?: WindowManagementDetailedScreen
    screens: WindowManagementDetailedScreen[]
  }

  interface Window {
    futae?: FutaeApi
    getScreenDetails?: () => Promise<WindowManagementScreenDetails>
  }
}

export {}

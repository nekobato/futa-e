/// <reference types="vite/client" />

import type { FutaeApi } from './shared/ipc'

declare global {
  interface Window {
    futae: FutaeApi
  }
}

export {}

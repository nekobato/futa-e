import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultConfig } from '../../src/shared/defaults'
import type { FutaeApi } from '../../src/shared/ipc'

/** Creates a minimal preload API double for API selection tests. */
const createPreloadApi = (): FutaeApi => ({
  config: {
    get: async () => createDefaultConfig(),
    getDiagnostics: async () => ({
      backend: 'electron-store',
      configExists: false,
      configPath: null
    }),
    getPlayback: async () => createDefaultConfig(),
    save: async (next) => next,
    onUpdated: () => () => undefined
  },
  assets: {
    pickFiles: async () => [],
    toUrl: (assetId) => `futae-media://asset/${assetId}`
  },
  displays: {
    list: async () => [],
    onChanged: () => () => undefined
  },
  player: {
    start: async () => ({ running: true, displayCount: 0 }),
    stop: async () => ({ running: false, displayCount: 0 }),
    status: async () => ({ running: false, displayCount: 0 }),
    heartbeat: () => undefined
  },
  system: {
    getLaunchAtLogin: async () => ({ supported: true, enabled: false }),
    setLaunchAtLogin: async (enabled) => ({ supported: true, enabled })
  }
})

describe('shared api selection', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    delete window.futae
  })

  it('prefers the preload bridge when Electron injects the API', async () => {
    const bridgedApi = createPreloadApi()
    window.futae = bridgedApi

    const { getFutaeApi } = await import('../../src/shared/api')

    expect(getFutaeApi()).toBe(bridgedApi)
  })

  it('fails when the preload bridge is missing', async () => {
    const { getFutaeApi } = await import('../../src/shared/api')

    expect(() => getFutaeApi()).toThrow(
      'Futa-e preload bridge was not injected.'
    )
  })
})

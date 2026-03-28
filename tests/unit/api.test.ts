import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBrowserMockApi } from '../../src/shared/mock-api'

describe('shared api selection', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    delete window.futae
  })

  it('prefers the preload bridge when Electron injects the API', async () => {
    const bridgedApi = createBrowserMockApi()
    window.futae = bridgedApi

    const { getFutaeApi } = await import('../../src/shared/api')

    expect(getFutaeApi()).toBe(bridgedApi)
  })

  it('warns and exposes the browser mock backend when the preload bridge is missing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 Electron/39.0.0'
    )

    const { getFutaeApi } = await import('../../src/shared/api')
    const api = getFutaeApi()

    await expect(api.config.getDiagnostics()).resolves.toEqual({
      backend: 'browser-mock',
      configExists: false,
      configPath: null
    })
    expect(warn).toHaveBeenCalledWith(
      'Futa-e preload bridge was not injected. Falling back to the browser mock API.'
    )
  })
})

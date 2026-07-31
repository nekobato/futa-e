import { describe, expect, it, vi } from 'vitest'
import {
  applyQuietAtelierColorScheme,
  installQuietAtelierTheme
} from '../../src/theme/quietAtelier'

describe('quiet atelier theme', () => {
  it('applies an explicit color scheme to the root element', () => {
    const root = document.createElement('html')

    applyQuietAtelierColorScheme(root, true)
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.dataset.colorScheme).toBe('dark')

    applyQuietAtelierColorScheme(root, false)
    expect(root.classList.contains('dark')).toBe(false)
    expect(root.dataset.colorScheme).toBe('light')
  })

  it('tracks system color-scheme changes and removes its listener', () => {
    const root = document.createElement('html')
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    const mediaQuery = {
      matches: true,
      addEventListener,
      removeEventListener
    } as unknown as MediaQueryList

    const cleanup = installQuietAtelierTheme(root, mediaQuery)
    const listener = addEventListener.mock.calls[0]?.[1] as (
      event: MediaQueryListEvent
    ) => void

    expect(root.classList.contains('dark')).toBe(true)
    listener({ matches: false } as MediaQueryListEvent)
    expect(root.dataset.colorScheme).toBe('light')

    cleanup()
    expect(removeEventListener).toHaveBeenCalledWith('change', listener)
  })
})

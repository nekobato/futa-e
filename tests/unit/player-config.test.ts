import { describe, expect, it } from 'vitest'
import { createDefaultConfig } from '../../src/shared/defaults'
import {
  countEnabledDisplays,
  ensureDisplayConfigs,
  getEffectiveDisplayConfig
} from '../../src/shared/player-config'
import type { DisplayInfo } from '../../src/shared/types'

const displays: DisplayInfo[] = [
  {
    id: '1',
    label: 'Display 1',
    isPrimary: true,
    bounds: { x: 0, y: 0, width: 1920, height: 1080 }
  },
  {
    id: '2',
    label: 'Display 2',
    isPrimary: false,
    bounds: { x: 1920, y: 0, width: 1920, height: 1080 }
  }
]

describe('player-config helpers', () => {
  it('seeds missing display configs from the shared config', () => {
    const config = createDefaultConfig()
    config.playlist = [
      {
        id: 'item-1',
        type: 'image',
        title: 'Item 1',
        src: '/safe-mode.svg'
      }
    ]
    config.overlay.title = 'Shared Overlay'

    const next = ensureDisplayConfigs(config, displays)

    expect(Object.keys(next.displays)).toEqual(['1', '2'])
    expect(next.displays['1']).toMatchObject({
      enabled: true,
      overlay: {
        title: 'Shared Overlay'
      }
    })
    expect(next.displays['1'].playlist).toHaveLength(1)
    expect(next.displays['1'].playlist).not.toBe(config.playlist)
  })

  it('uses shared settings while display mode is mirror', () => {
    const config = ensureDisplayConfigs(createDefaultConfig(), displays)
    config.overlay.title = 'Mirror Overlay'
    config.playlist = [
      {
        id: 'shared-1',
        type: 'image',
        title: 'Shared',
        src: '/safe-mode.svg'
      }
    ]

    const effective = getEffectiveDisplayConfig(config, '2')

    expect(effective.overlay.title).toBe('Mirror Overlay')
    expect(effective.playlist[0]?.id).toBe('shared-1')
  })

  it('counts enabled per-display windows only when per-display mode is active', () => {
    const config = ensureDisplayConfigs(createDefaultConfig(), displays)
    config.displayMode = 'per-display'
    config.displays['2'].enabled = false

    expect(countEnabledDisplays(config, displays)).toBe(1)
  })
})

import { describe, expect, it } from 'vitest'
import { createDefaultConfig } from '../../src/shared/defaults'
import {
  countEnabledDisplays,
  ensureDisplayConfigs,
  getActivePlaylist,
  getEffectiveDisplayConfig,
  getPlaylistById
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
  it('seeds missing display configs from all shared playlists', () => {
    const config = createDefaultConfig()
    config.playlists = [
      {
        id: 'shared',
        name: 'プレイリスト 1',
        perDisplay: true,
        loop: true,
        shuffle: false,
        defaultDurationSec: 10,
        webTimeoutSec: 8,
        items: [
          {
            id: 'item-1',
            type: 'image',
            title: 'Item 1',
            src: '/safe-mode.svg'
          }
        ]
      },
      {
        id: 'secondary',
        name: 'プレイリスト 2',
        perDisplay: false,
        loop: false,
        shuffle: true,
        defaultDurationSec: 15,
        webTimeoutSec: 12,
        items: []
      }
    ]

    const next = ensureDisplayConfigs(config, displays)

    expect(Object.keys(next.displays)).toEqual(['1', '2'])
    expect(next.displays['1'].enabled).toBe(true)
    expect(next.displays['1'].playlists).toHaveLength(2)
    expect(
      getPlaylistById(next.displays['1'].playlists, 'shared').items
    ).toHaveLength(1)
    expect(
      getPlaylistById(next.displays['1'].playlists, 'secondary').name
    ).toBe('プレイリスト 2')
    expect(
      getPlaylistById(next.displays['1'].playlists, 'secondary').shuffle
    ).toBe(true)
    expect(next.displays['1'].playlists).not.toBe(config.playlists)
  })

  it('returns the active playlist by id', () => {
    const config = createDefaultConfig()
    config.playlists = [
      {
        id: 'playlist-1',
        name: 'プレイリスト 1',
        perDisplay: false,
        loop: true,
        shuffle: false,
        defaultDurationSec: 10,
        webTimeoutSec: 8,
        items: []
      },
      {
        id: 'playlist-2',
        name: 'プレイリスト 2',
        perDisplay: true,
        loop: true,
        shuffle: false,
        defaultDurationSec: 10,
        webTimeoutSec: 8,
        items: []
      }
    ]
    config.activePlaylistId = 'playlist-2'

    expect(getActivePlaylist(config).id).toBe('playlist-2')
  })

  it('uses shared settings while the active playlist is shared across displays', () => {
    const config = ensureDisplayConfigs(createDefaultConfig(), displays)
    config.playlists = [
      {
        id: 'playlist-1',
        name: 'プレイリスト 1',
        perDisplay: false,
        loop: true,
        shuffle: false,
        defaultDurationSec: 10,
        webTimeoutSec: 8,
        items: []
      },
      {
        id: 'playlist-2',
        name: 'プレイリスト 2',
        perDisplay: false,
        loop: false,
        shuffle: true,
        defaultDurationSec: 15,
        webTimeoutSec: 11,
        items: [
          {
            id: 'shared-2',
            type: 'image',
            title: 'Shared',
            src: '/safe-mode.svg'
          }
        ]
      }
    ]
    config.activePlaylistId = 'playlist-2'
    config.displays = ensureDisplayConfigs(config, displays).displays

    const effective = getEffectiveDisplayConfig(config, '2')

    expect(
      getPlaylistById(effective.playlists, 'playlist-2').items[0]?.id
    ).toBe('shared-2')
    expect(getPlaylistById(effective.playlists, 'playlist-2').shuffle).toBe(
      true
    )
  })

  it('counts enabled per-display windows only when the active playlist is per-display', () => {
    const config = ensureDisplayConfigs(createDefaultConfig(), displays)
    config.playlists = [
      {
        id: 'playlist-1',
        name: 'プレイリスト 1',
        perDisplay: false,
        loop: true,
        shuffle: false,
        defaultDurationSec: 10,
        webTimeoutSec: 8,
        items: []
      },
      {
        id: 'playlist-2',
        name: 'プレイリスト 2',
        perDisplay: true,
        loop: true,
        shuffle: false,
        defaultDurationSec: 10,
        webTimeoutSec: 8,
        items: []
      }
    ]
    config.activePlaylistId = 'playlist-2'
    config.displays = ensureDisplayConfigs(config, displays).displays
    config.displays['2'].enabled = false

    expect(countEnabledDisplays(config, displays)).toBe(1)
  })
})

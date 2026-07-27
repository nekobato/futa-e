import { describe, expect, it } from 'vitest'
import {
  coerceConfig,
  createDefaultPlaylistName
} from '../../src/shared/defaults'

describe('config coercion', () => {
  it('builds stable fallback playlist names from a zero-based index', () => {
    expect(createDefaultPlaylistName(0)).toBe('プレイリスト 1')
    expect(createDefaultPlaylistName(2)).toBe('プレイリスト 3')
    expect(createDefaultPlaylistName(-1)).toBe('プレイリスト 1')
    expect(createDefaultPlaylistName(Number.NaN)).toBe('プレイリスト 1')
  })

  it('uses the saved active playlist when it exists', () => {
    const config = coerceConfig({
      version: 1,
      activePlaylistId: 'playlist-2',
      playlists: [
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
          loop: false,
          shuffle: true,
          defaultDurationSec: 20,
          webTimeoutSec: 12,
          items: []
        }
      ],
      displays: {},
      updatedAt: '2026-03-18T00:00:00.000Z'
    })

    expect(config.activePlaylistId).toBe('playlist-2')
  })

  it('normalizes playlist item playback modes', () => {
    const config = coerceConfig({
      version: 1,
      activePlaylistId: 'playlist-1',
      playlists: [
        {
          id: 'playlist-1',
          name: 'プレイリスト 1',
          perDisplay: false,
          loop: true,
          shuffle: false,
          defaultDurationSec: 10,
          webTimeoutSec: 8,
          items: [
            {
              id: 'legacy-duration',
              type: 'image',
              src: '/duration.png',
              durationSec: 12
            },
            {
              id: 'forever',
              type: 'web',
              src: 'https://example.com',
              playbackMode: 'forever',
              durationSec: 20
            },
            {
              id: 'explicit-auto',
              type: 'image',
              src: '/auto.png',
              playbackMode: 'auto',
              durationSec: 20
            }
          ]
        }
      ],
      displays: {},
      updatedAt: '2026-03-18T00:00:00.000Z'
    })

    expect(config.playlists[0]?.items[0]).toMatchObject({
      id: 'legacy-duration',
      playbackMode: 'duration',
      durationSec: 12
    })
    expect(config.playlists[0]?.items[1]).toMatchObject({
      id: 'forever',
      playbackMode: 'forever'
    })
    expect(config.playlists[0]?.items[1]?.durationSec).toBeUndefined()
    expect(config.playlists[0]?.items[2]).toMatchObject({
      id: 'explicit-auto',
      playbackMode: 'auto'
    })
    expect(config.playlists[0]?.items[2]?.durationSec).toBeUndefined()
  })

  it('preserves renderer-safe local asset display names', () => {
    const config = coerceConfig({
      version: 1,
      activePlaylistId: 'playlist-1',
      playlists: [
        {
          id: 'playlist-1',
          name: 'プレイリスト 1',
          perDisplay: false,
          loop: true,
          shuffle: false,
          defaultDurationSec: 10,
          webTimeoutSec: 8,
          items: [
            {
              id: 'web',
              type: 'web',
              src: 'https://example.com',
              sourceName: 'page.html',
              fallbackSrc: '11111111-1111-4111-8111-111111111111',
              fallbackName: 'fallback.png'
            }
          ]
        }
      ],
      displays: {},
      updatedAt: '2026-03-18T00:00:00.000Z'
    })

    expect(config.playlists[0]?.items[0]).toMatchObject({
      sourceName: 'page.html',
      fallbackName: 'fallback.png'
    })
  })

  it('migrates legacy app-managed cache entries back to their remote URL', () => {
    const config = coerceConfig({
      version: 1,
      activePlaylistId: 'playlist-1',
      playlists: [
        {
          id: 'playlist-1',
          name: 'プレイリスト 1',
          perDisplay: false,
          loop: true,
          shuffle: false,
          defaultDurationSec: 10,
          webTimeoutSec: 8,
          items: [
            {
              id: 'legacy-cached-image',
              type: 'image',
              src: '/Users/demo/Library/Application Support/Futa E/cache/image.png',
              originUrl: 'https://example.com/image.png'
            }
          ]
        }
      ],
      displays: {},
      updatedAt: '2026-03-18T00:00:00.000Z'
    })

    expect(config.playlists[0]?.items[0]).toMatchObject({
      id: 'legacy-cached-image',
      src: 'https://example.com/image.png'
    })
    expect(config.playlists[0]?.items[0]).not.toHaveProperty('originUrl')
  })

  it('converts legacy playlist and overlay settings into playlists', () => {
    const config = coerceConfig({
      version: 1,
      playlist: [
        {
          id: 'legacy-main',
          type: 'image',
          title: 'Main',
          src: '/main.png'
        }
      ],
      loop: true,
      shuffle: false,
      defaultDurationSec: 10,
      webTimeoutSec: 8,
      displayMode: 'per-display',
      overlay: {
        title: 'Legacy Overlay',
        message: 'Legacy message',
        imageSrc: '/cover.png'
      },
      displays: {},
      updatedAt: '2026-03-18T00:00:00.000Z'
    })

    expect(config.activePlaylistId).toBe(config.playlists[0]?.id)
    expect(config.playlists).toHaveLength(2)
    expect(config.playlists[0]).toMatchObject({
      name: 'プレイリスト 1',
      perDisplay: true,
      loop: true,
      shuffle: false,
      defaultDurationSec: 10,
      webTimeoutSec: 8
    })
    expect(config.playlists[0]?.items[0]).toMatchObject({
      id: 'legacy-main',
      src: '/main.png'
    })
    expect(config.playlists[0]?.items[0]).not.toHaveProperty('title')
    expect(config.playlists[1]).toMatchObject({
      name: 'プレイリスト 2',
      perDisplay: true,
      loop: true,
      shuffle: false,
      defaultDurationSec: 10,
      webTimeoutSec: 8
    })
    expect(config.playlists[1]?.items[0]).toMatchObject({
      type: 'image',
      src: '/cover.png'
    })
    expect(config.playlists[1]?.items[0]).not.toHaveProperty('title')
  })
})

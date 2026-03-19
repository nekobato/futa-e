import { describe, expect, it } from 'vitest'
import { coerceConfig } from '../../src/shared/defaults'

describe('config coercion', () => {
  it('uses the saved active playlist when it exists', () => {
    const config = coerceConfig({
      version: 1,
      activePlaylistId: 'playlist-2',
      playlists: [
        {
          id: 'playlist-1',
          name: 'プレイリスト 1',
          perDisplay: false,
          items: []
        },
        {
          id: 'playlist-2',
          name: 'プレイリスト 2',
          perDisplay: true,
          items: []
        }
      ],
      loop: true,
      shuffle: false,
      defaultDurationSec: 10,
      webTimeoutSec: 8,
      displays: {},
      updatedAt: '2026-03-18T00:00:00.000Z'
    })

    expect(config.activePlaylistId).toBe('playlist-2')
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
      perDisplay: true
    })
    expect(config.playlists[0]?.items[0]).toMatchObject({
      id: 'legacy-main',
      src: '/main.png'
    })
    expect(config.playlists[1]).toMatchObject({
      name: 'プレイリスト 2',
      perDisplay: true
    })
    expect(config.playlists[1]?.items[0]).toMatchObject({
      type: 'image',
      src: '/cover.png',
      title: 'cover.png'
    })
  })
})

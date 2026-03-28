import { describe, expect, it } from 'vitest'
import { createDefaultConfig } from '../../src/shared/defaults'
import {
  cloneStoredConfig,
  coerceStoredConfig,
  createDefaultStoredConfig
} from '../../src/shared/config-store'

describe('config store document', () => {
  it('migrates a legacy player config into the current storage shape', () => {
    const config = coerceStoredConfig({
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

  it('migrates the previous wrapped document to the local config only', () => {
    const localConfig = createDefaultConfig()
    const cloudConfig = createDefaultConfig()
    cloudConfig.playlists[0]!.name = 'Cloud Playlist'

    const config = coerceStoredConfig({
      localConfig,
      cloud: {
        cachedConfig: cloudConfig,
        etag: 'etag-1',
        lastFetchedAt: '2026-03-26T00:00:00.000Z',
        manifestUrl: 'https://example.com/manifest.json'
      },
      updatedAt: '2026-03-26T00:00:00.000Z'
    })

    expect(config).toEqual(localConfig)
    expect(config).not.toHaveProperty('cloud')
  })

  it('clones editable config before persisting it', () => {
    const nextLocalConfig = createDefaultConfig()
    nextLocalConfig.playlists[0]!.name = 'Local Draft'

    const stored = cloneStoredConfig(nextLocalConfig)

    expect(stored).toEqual(nextLocalConfig)
    expect(stored).not.toBe(nextLocalConfig)
  })

  it('provides a plain player config as the default persisted value', () => {
    const stored = createDefaultStoredConfig()

    expect(stored).toMatchObject({
      version: 1,
      displays: {}
    })
    expect(stored).toHaveProperty('playlists')
    expect(stored).not.toHaveProperty('cloud')
  })
})

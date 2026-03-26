import { describe, expect, it } from 'vitest'
import { createDefaultConfig } from '../../src/shared/defaults'
import {
  coerceStoredConfigDocument,
  resolvePlaybackConfig,
  updateLocalConfigDocument
} from '../../src/shared/config-store'

describe('config store document', () => {
  it('migrates a legacy player config into local mode storage', () => {
    const document = coerceStoredConfigDocument({
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

    expect(document.mode).toBe('local')
    expect(document.localConfig.activePlaylistId).toBe('playlist-2')
    expect(document.cloud.cachedConfig.activePlaylistId).toBe('playlist-2')
  })

  it('resolves playback config from the cloud cache when cloud mode is active', () => {
    const localConfig = createDefaultConfig()
    const cloudConfig = createDefaultConfig()
    cloudConfig.playlists[0]!.name = 'Cloud Playlist'

    const document = coerceStoredConfigDocument({
      mode: 'cloud',
      localConfig,
      cloud: {
        cachedConfig: cloudConfig,
        etag: 'etag-1',
        lastFetchedAt: '2026-03-26T00:00:00.000Z',
        manifestUrl: 'https://example.com/manifest.json'
      },
      updatedAt: '2026-03-26T00:00:00.000Z'
    })

    expect(resolvePlaybackConfig(document).playlists[0]?.name).toBe(
      'Cloud Playlist'
    )
  })

  it('updates only the local editable config when saving from the local editor', () => {
    const localConfig = createDefaultConfig()
    const cloudConfig = createDefaultConfig()
    cloudConfig.playlists[0]!.name = 'Cloud Playlist'

    const document = coerceStoredConfigDocument({
      mode: 'cloud',
      localConfig,
      cloud: {
        cachedConfig: cloudConfig,
        etag: 'etag-1',
        lastFetchedAt: '2026-03-26T00:00:00.000Z',
        manifestUrl: 'https://example.com/manifest.json'
      },
      updatedAt: '2026-03-26T00:00:00.000Z'
    })

    const nextLocalConfig = createDefaultConfig()
    nextLocalConfig.playlists[0]!.name = 'Local Draft'

    const nextDocument = updateLocalConfigDocument(document, nextLocalConfig)

    expect(nextDocument.localConfig.playlists[0]?.name).toBe('Local Draft')
    expect(nextDocument.cloud.cachedConfig.playlists[0]?.name).toBe(
      'Cloud Playlist'
    )
  })
})

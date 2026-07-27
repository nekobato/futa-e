import { describe, expect, it } from 'vitest'
import {
  assertConfigLocalAssetsAuthorized,
  collectAllowedLocalAssets,
  migrateConfigLocalAssets
} from '../../electron/local-asset-config'
import {
  createDefaultLocalAssetRegistry,
  createLocalAssetRegistry,
  type StoredLocalAssetRegistry
} from '../../electron/local-asset-registry'
import { createDefaultConfig } from '../../src/shared/defaults'

const IMAGE_ID = '11111111-1111-4111-8111-111111111111'

/** Creates an in-memory registry for config migration tests. */
const createRegistry = () => {
  let document: StoredLocalAssetRegistry = createDefaultLocalAssetRegistry()
  return createLocalAssetRegistry({
    storage: {
      read: () => document,
      write: (next) => {
        document = next
      }
    },
    fileSystem: {
      realpath: async (filePath) => filePath,
      stat: async () => ({
        isFile: () => true,
        size: 100
      })
    },
    createAssetId: () => IMAGE_ID
  })
}

describe('local asset config migration', () => {
  it('replaces legacy absolute paths with opaque IDs and display names', async () => {
    const registry = createRegistry()
    const config = createDefaultConfig()
    config.playlists[0]!.items = [
      {
        id: 'web',
        type: 'web',
        src: 'https://example.com',
        fallbackSrc: '/Volumes/Media/fallback.png'
      },
      {
        id: 'image',
        type: 'image',
        src: '/Volumes/Media/fallback.png'
      }
    ]

    const migrated = await migrateConfigLocalAssets(config, registry)

    expect(migrated.playlists[0]?.items[0]).toMatchObject({
      fallbackSrc: IMAGE_ID,
      fallbackName: 'fallback.png'
    })
    expect(migrated.playlists[0]?.items[1]).toMatchObject({
      src: IMAGE_ID,
      sourceName: 'fallback.png'
    })
  })

  it('rejects absolute paths supplied through renderer config', () => {
    const registry = createRegistry()
    const config = createDefaultConfig()
    config.playlists[0]!.items = [
      {
        id: 'image',
        type: 'image',
        src: '/Users/demo/secret.png'
      }
    ]

    expect(() => assertConfigLocalAssetsAuthorized(config, registry)).toThrow(
      'unauthorized local asset reference'
    )
  })

  it('preserves unknown opaque IDs but rejects known type confusion', async () => {
    const registry = createRegistry()
    await registry.register('/Volumes/Media/slide.png', 'image')
    const unknownConfig = createDefaultConfig()
    unknownConfig.playlists[0]!.items = [
      {
        id: 'unknown',
        type: 'image',
        src: '22222222-2222-4222-8222-222222222222'
      }
    ]
    const confusedConfig = createDefaultConfig()
    confusedConfig.playlists[0]!.items = [
      {
        id: 'confused',
        type: 'video',
        src: IMAGE_ID
      }
    ]

    expect(() =>
      assertConfigLocalAssetsAuthorized(unknownConfig, registry)
    ).not.toThrow()
    expect(() =>
      assertConfigLocalAssetsAuthorized(confusedConfig, registry)
    ).toThrow('unauthorized local asset reference')
  })

  it('collects only opaque IDs used by the playback document', async () => {
    const registry = createRegistry()
    await registry.register('/Volumes/Media/slide.png', 'image')
    const config = createDefaultConfig()
    config.playlists[0]!.items = [
      {
        id: 'local',
        type: 'image',
        src: IMAGE_ID
      },
      {
        id: 'remote',
        type: 'video',
        src: 'https://example.com/clip.mp4'
      }
    ]

    expect([...collectAllowedLocalAssets(config)]).toEqual([
      [IMAGE_ID, 'image']
    ])
  })
})

import { describe, expect, it } from 'vitest'
import {
  createDefaultLocalAssetRegistry,
  createLocalAssetRegistry,
  type StoredLocalAssetRegistry
} from '../../electron/local-asset-registry'

const ASSET_ID = '11111111-1111-4111-8111-111111111111'

/** Creates an in-memory registry with controllable filesystem metadata. */
const createRegistryFixture = ({
  files = new Map<string, { realPath: string; size: number }>()
}: {
  files?: Map<string, { realPath: string; size: number }>
} = {}) => {
  let document: StoredLocalAssetRegistry = createDefaultLocalAssetRegistry()
  const registry = createLocalAssetRegistry({
    storage: {
      read: () => document,
      write: (next) => {
        document = next
      }
    },
    fileSystem: {
      realpath: async (filePath) => {
        const file = files.get(filePath)
        if (!file) {
          throw new Error('missing')
        }
        return file.realPath
      },
      stat: async (realPath) => {
        const file = [...files.values()].find(
          (candidate) => candidate.realPath === realPath
        )
        if (!file) {
          throw new Error('missing')
        }
        return {
          isFile: () => true,
          size: file.size
        }
      }
    },
    createAssetId: () => ASSET_ID
  })

  return {
    files,
    getDocument: () => document,
    registry
  }
}

describe('local asset registry', () => {
  it('registers a selected external file without exposing its path', async () => {
    const fixture = createRegistryFixture({
      files: new Map([
        [
          '/Volumes/Media/slide.png',
          { realPath: '/Volumes/Media/slide.png', size: 128 }
        ]
      ])
    })

    await expect(
      fixture.registry.register('/Volumes/Media/slide.png', 'image')
    ).resolves.toEqual({
      id: ASSET_ID,
      type: 'image',
      name: 'slide.png'
    })
    expect(fixture.getDocument().assets[ASSET_ID]).toMatchObject({
      path: '/Volumes/Media/slide.png',
      realPath: '/Volumes/Media/slide.png',
      type: 'image'
    })
  })

  it('rejects unknown extensions and requested type mismatches', async () => {
    const fixture = createRegistryFixture({
      files: new Map([
        ['/tmp/slide.txt', { realPath: '/tmp/slide.txt', size: 10 }],
        ['/tmp/slide.png', { realPath: '/tmp/slide.png', size: 10 }]
      ])
    })

    await expect(
      fixture.registry.register('/tmp/slide.txt', 'image')
    ).resolves.toBeNull()
    await expect(
      fixture.registry.register('/tmp/slide.png', 'video')
    ).resolves.toBeNull()
  })

  it('deduplicates repeated selection by canonical path and media type', async () => {
    const fixture = createRegistryFixture({
      files: new Map([
        ['/tmp/link.png', { realPath: '/Volumes/Media/slide.png', size: 128 }],
        [
          '/Volumes/Media/slide.png',
          { realPath: '/Volumes/Media/slide.png', size: 128 }
        ]
      ])
    })

    const first = await fixture.registry.register('/tmp/link.png', 'image')
    const second = await fixture.registry.register(
      '/Volumes/Media/slide.png',
      'image'
    )

    expect(second).toEqual(first)
    expect(Object.keys(fixture.getDocument().assets)).toHaveLength(1)
  })

  it('keeps an unavailable legacy path and authorizes it when it returns', async () => {
    const fixture = createRegistryFixture()

    await expect(
      fixture.registry.registerLegacy('/Volumes/Offline/slide.png', 'image')
    ).resolves.toMatchObject({
      id: ASSET_ID,
      name: 'slide.png'
    })
    expect(fixture.getDocument().assets[ASSET_ID]?.realPath).toBeNull()

    fixture.files.set('/Volumes/Offline/slide.png', {
      realPath: '/Volumes/Offline/slide.png',
      size: 256
    })

    await expect(fixture.registry.resolve(ASSET_ID, 'image')).resolves.toEqual(
      expect.objectContaining({
        realPath: '/Volumes/Offline/slide.png',
        mimeType: 'image/png',
        size: 256
      })
    )
    expect(fixture.getDocument().assets[ASSET_ID]?.realPath).toBe(
      '/Volumes/Offline/slide.png'
    )
  })

  it('denies a selected path when its canonical target changes', async () => {
    const fixture = createRegistryFixture({
      files: new Map([
        [
          '/tmp/link.mp4',
          { realPath: '/Volumes/Media/original.mp4', size: 512 }
        ]
      ])
    })
    await fixture.registry.register('/tmp/link.mp4', 'video')

    fixture.files.set('/tmp/link.mp4', {
      realPath: '/Volumes/Media/replaced.mp4',
      size: 512
    })

    await expect(
      fixture.registry.resolve(ASSET_ID, 'video')
    ).resolves.toBeNull()
  })
})

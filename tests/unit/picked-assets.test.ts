import { describe, expect, it } from 'vitest'
import {
  dialogExtensionsForKind,
  inferAssetTypeFromPath,
  toPickedAssetFromPath
} from '../../src/shared/picked-assets'

describe('picked asset helpers', () => {
  it('infers asset type from file path extensions', () => {
    expect(inferAssetTypeFromPath('/tmp/HERO.PNG')).toBe('image')
    expect(inferAssetTypeFromPath('C:\\media\\intro.WEBM')).toBe('video')
    expect(inferAssetTypeFromPath('/tmp/readme.txt')).toBeNull()
  })

  it('uses the requested kind even when the file path extension is unknown', () => {
    expect(toPickedAssetFromPath('/tmp/slide', 'image')).toEqual({
      path: '/tmp/slide',
      type: 'image',
      name: 'slide'
    })
    expect(toPickedAssetFromPath('/tmp/clip', 'video')).toEqual({
      path: '/tmp/clip',
      type: 'video',
      name: 'clip'
    })
  })

  it('keeps media mode conservative for unknown extensions', () => {
    expect(toPickedAssetFromPath('/tmp/slide', 'media')).toBeNull()
  })

  it('returns dialog extensions for each supported kind', () => {
    expect(dialogExtensionsForKind('image')).toContain('.png')
    expect(dialogExtensionsForKind('video')).toContain('.mp4')
    expect(dialogExtensionsForKind('media')).toEqual(
      expect.arrayContaining(['.png', '.mp4'])
    )
  })
})

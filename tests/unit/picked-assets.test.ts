import { describe, expect, it } from 'vitest'
import {
  dialogExtensionsForKind,
  inferAssetTypeFromPath,
  localAssetMimeTypeFromPath
} from '../../src/shared/picked-assets'

describe('picked asset helpers', () => {
  it('infers asset type from file path extensions', () => {
    expect(inferAssetTypeFromPath('/tmp/HERO.PNG')).toBe('image')
    expect(inferAssetTypeFromPath('C:\\media\\intro.WEBM')).toBe('video')
    expect(inferAssetTypeFromPath('/tmp/readme.txt')).toBeNull()
  })

  it('maps supported extensions to fixed response MIME types', () => {
    expect(localAssetMimeTypeFromPath('/tmp/slide.JPEG')).toBe('image/jpeg')
    expect(localAssetMimeTypeFromPath('/tmp/clip.mov')).toBe('video/quicktime')
    expect(localAssetMimeTypeFromPath('/tmp/readme.txt')).toBeNull()
  })

  it('returns dialog extensions for each supported kind', () => {
    expect(dialogExtensionsForKind('image')).toContain('.png')
    expect(dialogExtensionsForKind('video')).toContain('.mp4')
    expect(dialogExtensionsForKind('media')).toEqual(
      expect.arrayContaining(['.png', '.mp4'])
    )
  })
})

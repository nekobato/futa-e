import { describe, expect, it } from 'vitest'
import {
  isAllowedWebUrl,
  isDirectMediaUrl,
  isLikelyLocalFilePath
} from '../../src/shared/utils'
import { isBundledMediaSource } from '../../src/shared/local-assets'

describe('shared utils', () => {
  it('allows only absolute HTTPS URLs for Web playlist items', () => {
    expect(isAllowedWebUrl('https://example.com')).toBe(true)
    expect(isAllowedWebUrl('  HTTPS://example.com/path?q=1#section  ')).toBe(
      true
    )

    expect(isAllowedWebUrl('http://example.com')).toBe(false)
    expect(isAllowedWebUrl('file:///Users/demo/page.html')).toBe(false)
    expect(isAllowedWebUrl('data:text/html,<h1>demo</h1>')).toBe(false)
    expect(isAllowedWebUrl('futae-media://local/page.html')).toBe(false)
    expect(isAllowedWebUrl('/relative/path')).toBe(false)
    expect(isAllowedWebUrl('not a URL')).toBe(false)
    expect(isAllowedWebUrl('')).toBe(false)
  })

  it('detects likely local file paths without treating public assets as local files', () => {
    expect(isLikelyLocalFilePath('/Users/nekobato/Pictures/slide.png')).toBe(
      true
    )
    expect(isLikelyLocalFilePath('/home/demo/slide.png')).toBe(true)
    expect(isLikelyLocalFilePath('C:\\Users\\demo\\slide.png')).toBe(true)
    expect(isLikelyLocalFilePath('/safe-mode.svg')).toBe(false)
    expect(isLikelyLocalFilePath('/images/slide.png')).toBe(false)
    expect(isLikelyLocalFilePath('https://example.com/slide.png')).toBe(false)
  })

  it('loads only explicit network or in-memory media URLs directly', () => {
    expect(isDirectMediaUrl('https://example.com/slide.png')).toBe(true)
    expect(isDirectMediaUrl('http://example.com/clip.mp4')).toBe(true)
    expect(isDirectMediaUrl('blob:https://example.com/id')).toBe(true)
    expect(isDirectMediaUrl('data:image/png;base64,AA==')).toBe(true)

    expect(isDirectMediaUrl('/Users/demo/slide.png')).toBe(false)
    expect(isDirectMediaUrl('futae-media://asset/id')).toBe(false)
    expect(isDirectMediaUrl('file:///Users/demo/slide.png')).toBe(false)
    expect(isDirectMediaUrl('/safe-mode.svg')).toBe(false)
  })

  it('recognizes only the packaged Safe Mode media source', () => {
    expect(isBundledMediaSource('/safe-mode.svg')).toBe(true)
    expect(isBundledMediaSource('/images/slide.png')).toBe(false)
  })
})

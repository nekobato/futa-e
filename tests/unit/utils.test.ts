import { describe, expect, it } from 'vitest'
import { isLikelyLocalFilePath } from '../../src/shared/utils'

describe('shared utils', () => {
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
})

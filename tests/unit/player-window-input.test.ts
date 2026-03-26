import { describe, expect, it } from 'vitest'
import { shouldExitPlayerWindows } from '../../electron/player-window-input'

describe('player window input', () => {
  it('exits player windows on Escape keyDown', () => {
    expect(
      shouldExitPlayerWindows({
        key: 'Escape',
        type: 'keyDown'
      })
    ).toBe(true)

    expect(
      shouldExitPlayerWindows({
        code: 'Escape',
        type: 'keyDown'
      })
    ).toBe(true)
  })

  it('ignores non-Escape and keyUp events', () => {
    expect(
      shouldExitPlayerWindows({
        key: 'Enter',
        type: 'keyDown'
      })
    ).toBe(false)

    expect(
      shouldExitPlayerWindows({
        key: 'Escape',
        type: 'keyUp'
      })
    ).toBe(false)
  })
})

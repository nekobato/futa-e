import { describe, expect, it } from 'vitest'
import {
  createPlayerExitShortcutDetector,
  shouldBlockPlayerWindowEscape
} from '../../electron/player-window-input'

describe('player window input', () => {
  it('exits player windows after three Escape keyDown events within two seconds', () => {
    let now = 0
    const shouldExitPlayerWindows = createPlayerExitShortcutDetector({
      now: () => now
    })

    expect(shouldExitPlayerWindows({ key: 'Escape', type: 'keyDown' })).toBe(
      false
    )

    now = 750
    expect(shouldExitPlayerWindows({ code: 'Escape', type: 'keyDown' })).toBe(
      false
    )

    now = 1500
    expect(shouldExitPlayerWindows({ key: 'Escape', type: 'keyDown' })).toBe(
      true
    )
  })

  it('keeps waiting when three Escape events exceed the two second window', () => {
    let now = 0
    const shouldExitPlayerWindows = createPlayerExitShortcutDetector({
      now: () => now
    })

    expect(shouldExitPlayerWindows({ key: 'Escape', type: 'keyDown' })).toBe(
      false
    )

    now = 1000
    expect(shouldExitPlayerWindows({ key: 'Escape', type: 'keyDown' })).toBe(
      false
    )

    now = 2001
    expect(shouldExitPlayerWindows({ key: 'Escape', type: 'keyDown' })).toBe(
      false
    )
  })

  it('ignores non-Escape, keyUp, and auto-repeat events for the exit count', () => {
    let now = 0
    const shouldExitPlayerWindows = createPlayerExitShortcutDetector({
      now: () => now
    })

    expect(shouldExitPlayerWindows({ key: 'Enter', type: 'keyDown' })).toBe(
      false
    )
    expect(shouldExitPlayerWindows({ key: 'Escape', type: 'keyUp' })).toBe(
      false
    )
    expect(shouldExitPlayerWindows({ key: 'Escape', type: 'keyDown' })).toBe(
      false
    )

    now = 250
    expect(
      shouldExitPlayerWindows({
        key: 'Escape',
        type: 'keyDown',
        isAutoRepeat: true
      })
    ).toBe(false)

    now = 500
    expect(
      shouldExitPlayerWindows({
        key: 'Escape',
        type: 'keyDown',
        isAutoRepeat: true
      })
    ).toBe(false)

    now = 750
    expect(shouldExitPlayerWindows({ key: 'Escape', type: 'keyDown' })).toBe(
      false
    )

    now = 1000
    expect(shouldExitPlayerWindows({ key: 'Escape', type: 'keyDown' })).toBe(
      true
    )
  })

  it('blocks Escape keyDown events while ignoring other input', () => {
    expect(
      shouldBlockPlayerWindowEscape({
        key: 'Escape',
        type: 'keyDown'
      })
    ).toBe(true)
    expect(
      shouldBlockPlayerWindowEscape({
        code: 'Escape',
        type: 'keyDown',
        isAutoRepeat: true
      })
    ).toBe(true)
    expect(
      shouldBlockPlayerWindowEscape({
        key: 'Escape',
        type: 'keyUp'
      })
    ).toBe(false)
    expect(
      shouldBlockPlayerWindowEscape({
        key: 'Enter',
        type: 'keyDown'
      })
    ).toBe(false)
  })
})

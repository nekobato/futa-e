import { describe, expect, it } from 'vitest'
import type { RecordedHotkey } from 'v-record-hotkey'
import {
  acceleratorToHotkey,
  hotkeyToAccelerator
} from '../../src/shared/hotkey-accelerator'

const hotkey = (
  code: string,
  key: string,
  modifiers: RecordedHotkey['modifiers'] = []
): RecordedHotkey => ({ code, key, modifiers, location: 0 })

describe('recorded hotkeys to Electron accelerators', () => {
  it('maps Command and Windows keys without treating Control as Command', () => {
    const shortcut = hotkey('KeyJ', 'j', ['Ctrl', 'Shift', 'Meta'])
    expect(hotkeyToAccelerator(shortcut, true)).toBe('Command+Control+Shift+J')
    expect(hotkeyToAccelerator(shortcut, false)).toBe('Super+Control+Shift+J')
  })

  it('preserves the base key when Shift or macOS Option changes the character', () => {
    expect(hotkeyToAccelerator(hotkey('Digit1', '!', ['Shift']), true)).toBe(
      'Shift+1'
    )
    expect(hotkeyToAccelerator(hotkey('KeyK', '˚', ['Alt']), true)).toBe(
      'Alt+K'
    )
  })

  it.each([
    ['ArrowUp', 'ArrowUp', 'Up'],
    ['Space', ' ', 'Space'],
    ['F24', 'F24', 'F24'],
    ['Numpad4', '4', 'num4'],
    ['NumpadAdd', '+', 'numadd'],
    ['NumpadDecimal', '.', 'numdec'],
    ['NumpadEnter', 'Enter', 'Enter'],
    ['AudioVolumeUp', 'AudioVolumeUp', 'VolumeUp'],
    ['Equal', '+', '='],
    ['', '+', 'Plus']
  ])('converts %s / %s to %s', (code, key, accelerator) => {
    expect(hotkeyToAccelerator(hotkey(code, key), true)).toBe(accelerator)
  })

  it('rejects unsupported keys rather than registering their raw code', () => {
    expect(hotkeyToAccelerator(hotkey('IntlRo', 'ろ'), true)).toBeNull()
    expect(hotkeyToAccelerator(hotkey('ShiftLeft', 'Shift'), true)).toBeNull()
  })
})

describe('persisted accelerator display', () => {
  it('resolves CommandOrControl for the current OS', () => {
    expect(acceleratorToHotkey('CommandOrControl+Shift+K', true)).toEqual(
      hotkey('KeyK', 'K', ['Meta', 'Shift'])
    )
    expect(acceleratorToHotkey('CommandOrControl+Shift+K', false)).toEqual(
      hotkey('KeyK', 'K', ['Ctrl', 'Shift'])
    )
  })

  it('accepts case-insensitive Electron aliases and literal plus keys', () => {
    expect(acceleratorToHotkey('cmdorctrl+option+esc', true)).toEqual(
      hotkey('Escape', 'esc', ['Meta', 'Alt'])
    )
    expect(acceleratorToHotkey('Ctrl++', false)).toEqual(
      hotkey('', '+', ['Ctrl'])
    )
    expect(acceleratorToHotkey('Control+Return', false)?.code).toBe('Enter')
  })

  it('preserves numpad identity and special key names', () => {
    expect(acceleratorToHotkey('Control+numadd', false)).toEqual({
      ...hotkey('NumpadAdd', 'numadd', ['Ctrl']),
      location: 3
    })
    expect(acceleratorToHotkey('Shift+Up', false)?.code).toBe('ArrowUp')
  })

  it('leaves unrepresentable settings to the original accelerator display', () => {
    expect(acceleratorToHotkey('AltGr+K', false)).toBeNull()
    expect(acceleratorToHotkey('Control+UnknownKey', false)).toBeNull()
    expect(acceleratorToHotkey('', false)).toBeNull()
  })
})

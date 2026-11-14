import type { ModKey, RecordedHotkey } from 'v-record-hotkey'

const CODE_TO_ACCELERATOR: Record<string, string> = {
  Backquote: '`',
  Backslash: '\\',
  BracketLeft: '[',
  BracketRight: ']',
  Comma: ',',
  Equal: '=',
  Minus: '-',
  Period: '.',
  Quote: "'",
  Semicolon: ';',
  Slash: '/',
  Space: 'Space',
  Tab: 'Tab',
  CapsLock: 'Capslock',
  NumLock: 'Numlock',
  ScrollLock: 'Scrolllock',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Enter: 'Enter',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Escape: 'Escape',
  AudioVolumeUp: 'VolumeUp',
  AudioVolumeDown: 'VolumeDown',
  AudioVolumeMute: 'VolumeMute',
  MediaTrackNext: 'MediaNextTrack',
  MediaTrackPrevious: 'MediaPreviousTrack',
  MediaStop: 'MediaStop',
  MediaPlayPause: 'MediaPlayPause',
  PrintScreen: 'PrintScreen',
  NumpadAdd: 'numadd',
  NumpadSubtract: 'numsub',
  NumpadMultiply: 'nummult',
  NumpadDivide: 'numdiv',
  NumpadDecimal: 'numdec',
  NumpadEnter: 'Enter'
}

const PUNCTUATION = new Set('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~')

/** Uses base key codes so Shift and Option do not change the recorded key. */
export const hotkeyToAccelerator = (
  hotkey: RecordedHotkey,
  isMac: boolean
): string | null => {
  let key: string | undefined
  if (/^Key[A-Z]$/.test(hotkey.code)) {
    key = hotkey.code.slice(3)
  } else if (/^Digit[0-9]$/.test(hotkey.code)) {
    key = hotkey.code.slice(5)
  } else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(hotkey.code)) {
    key = hotkey.code
  } else if (/^Numpad[0-9]$/.test(hotkey.code)) {
    key = `num${hotkey.code.slice(6)}`
  } else {
    key = CODE_TO_ACCELERATOR[hotkey.code]
  }

  if (!key && (/^[a-z0-9]$/i.test(hotkey.key) || PUNCTUATION.has(hotkey.key))) {
    key = hotkey.key === '+' ? 'Plus' : hotkey.key.toUpperCase()
  }
  if (!key) return null

  const modifierLabels: Record<ModKey, string> = {
    Ctrl: 'Control',
    Alt: 'Alt',
    Shift: 'Shift',
    Meta: isMac ? 'Command' : 'Super'
  }
  const modifierOrder: ModKey[] = ['Meta', 'Ctrl', 'Alt', 'Shift']
  return [
    ...modifierOrder
      .filter((modifier) => hotkey.modifiers.includes(modifier))
      .map((modifier) => modifierLabels[modifier]),
    key
  ].join('+')
}

/** Builds a display value without rewriting the persisted accelerator. */
export const acceleratorToHotkey = (
  accelerator: string,
  isMac: boolean
): RecordedHotkey | null => {
  const tokens = (
    accelerator === '+' ? 'Plus' : accelerator.replace(/\+\+$/, '+Plus')
  )
    .split('+')
    .map((token) => token.trim())
  const key = tokens.pop()
  if (!key) return null

  const aliases: Record<string, ModKey> = {
    command: 'Meta',
    cmd: 'Meta',
    control: 'Ctrl',
    ctrl: 'Ctrl',
    commandorcontrol: isMac ? 'Meta' : 'Ctrl',
    cmdorctrl: isMac ? 'Meta' : 'Ctrl',
    alt: 'Alt',
    option: 'Alt',
    shift: 'Shift',
    super: 'Meta',
    meta: 'Meta'
  }
  const modifiers: ModKey[] = []
  for (const token of tokens) {
    const modifier = aliases[token.toLowerCase()]
    if (!modifier) return null
    modifiers.push(modifier)
  }

  const normalizedKey = key.toLowerCase()
  let code = ''
  if (/^[a-z]$/i.test(key)) {
    code = `Key${key.toUpperCase()}`
  } else if (/^[0-9]$/.test(key)) {
    code = `Digit${key}`
  } else if (/^f([1-9]|1[0-9]|2[0-4])$/i.test(key)) {
    code = key.toUpperCase()
  } else if (/^num[0-9]$/i.test(key)) {
    code = `Numpad${key.slice(3)}`
  } else {
    code =
      Object.keys(CODE_TO_ACCELERATOR).find(
        (code) => CODE_TO_ACCELERATOR[code].toLowerCase() === normalizedKey
      ) ?? ''
    if (normalizedKey === 'return') code = 'Enter'
    if (normalizedKey === 'esc') code = 'Escape'
    if (!code && normalizedKey !== 'plus' && !PUNCTUATION.has(key)) return null
  }

  return {
    code,
    key: normalizedKey === 'plus' ? '+' : key,
    modifiers,
    location: code.startsWith('Numpad') ? 3 : 0
  }
}

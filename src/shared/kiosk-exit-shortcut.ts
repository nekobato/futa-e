export const DEFAULT_KIOSK_EXIT_SHORTCUT = 'CommandOrControl+Shift+K'
export const MAX_KIOSK_EXIT_SHORTCUT_LENGTH = 100

/**
 * Normalizes a persisted Electron accelerator and falls back when it is empty
 * or unreasonably long. Electron performs the final syntax validation.
 */
export const coerceKioskExitShortcut = (value: unknown): string => {
  if (typeof value !== 'string') {
    return DEFAULT_KIOSK_EXIT_SHORTCUT
  }

  const accelerator = value.trim()
  return accelerator.length > 0 &&
    accelerator.length <= MAX_KIOSK_EXIT_SHORTCUT_LENGTH
    ? accelerator
    : DEFAULT_KIOSK_EXIT_SHORTCUT
}

/** Returns a trimmed user-entered accelerator or null for an empty value. */
export const parseKioskExitShortcutInput = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const accelerator = value.trim()
  return accelerator.length > 0 &&
    accelerator.length <= MAX_KIOSK_EXIT_SHORTCUT_LENGTH
    ? accelerator
    : null
}

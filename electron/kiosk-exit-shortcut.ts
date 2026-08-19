import type { GlobalShortcut } from 'electron'
import type { KioskExitShortcutSettings } from '../src/shared/ipc'

type GlobalShortcutRegistrar = Pick<
  GlobalShortcut,
  'isRegistered' | 'register' | 'unregister'
>

export type KioskExitShortcutFailureReason = 'invalid' | 'unavailable'

export type KioskExitShortcutRegistrationResult =
  | {
      ok: true
      settings: KioskExitShortcutSettings
    }
  | {
      ok: false
      reason: KioskExitShortcutFailureReason
      settings: KioskExitShortcutSettings
    }

export type KioskExitShortcutController = {
  deactivate: () => void
  get: (configuredAccelerator: string) => KioskExitShortcutSettings
  getActiveAccelerator: () => string | null
  set: (accelerator: string) => KioskExitShortcutRegistrationResult
}

/**
 * Owns the single system-wide shortcut used to leave Kiosk mode.
 * A replacement is registered before the previous accelerator is released.
 */
export const createKioskExitShortcutController = (
  registrar: GlobalShortcutRegistrar,
  onExit: () => void
): KioskExitShortcutController => {
  let activeAccelerator: string | null = null

  const isRegistered = (accelerator: string): boolean => {
    try {
      return registrar.isRegistered(accelerator)
    } catch {
      return false
    }
  }

  const get = (configuredAccelerator: string): KioskExitShortcutSettings => ({
    accelerator: configuredAccelerator,
    registered:
      activeAccelerator === configuredAccelerator &&
      isRegistered(configuredAccelerator)
  })

  const set = (accelerator: string): KioskExitShortcutRegistrationResult => {
    if (activeAccelerator === accelerator && isRegistered(accelerator)) {
      return { ok: true, settings: get(accelerator) }
    }

    let registered = false
    try {
      registered = registrar.register(accelerator, onExit)
    } catch {
      return {
        ok: false,
        reason: 'invalid',
        settings: get(accelerator)
      }
    }

    if (!registered) {
      return {
        ok: false,
        reason: 'unavailable',
        settings: get(accelerator)
      }
    }

    if (activeAccelerator && activeAccelerator !== accelerator) {
      registrar.unregister(activeAccelerator)
    }
    activeAccelerator = accelerator

    return { ok: true, settings: get(accelerator) }
  }

  const deactivate = () => {
    if (activeAccelerator) {
      registrar.unregister(activeAccelerator)
      activeAccelerator = null
    }
  }

  return {
    deactivate,
    get,
    getActiveAccelerator: () => activeAccelerator,
    set
  }
}

import { describe, expect, it, vi } from 'vitest'
import { createKioskExitShortcutController } from '../../electron/kiosk-exit-shortcut'
import {
  coerceKioskExitShortcut,
  DEFAULT_KIOSK_EXIT_SHORTCUT,
  parseKioskExitShortcutInput
} from '../../src/shared/kiosk-exit-shortcut'
import { coerceConfig, createDefaultConfig } from '../../src/shared/defaults'

const createRegistrar = (unavailable = new Set<string>()) => {
  const registrations = new Map<string, () => void>()
  const registrar = {
    isRegistered: vi.fn((accelerator: string) =>
      registrations.has(accelerator)
    ),
    register: vi.fn((accelerator: string, callback: () => void) => {
      if (accelerator === 'Invalid') {
        throw new Error('Invalid accelerator')
      }
      if (unavailable.has(accelerator)) {
        return false
      }
      registrations.set(accelerator, callback)
      return true
    }),
    unregister: vi.fn((accelerator: string) => {
      registrations.delete(accelerator)
    })
  }

  return { registrations, registrar }
}

describe('Kiosk exit shortcut input', () => {
  it('provides a cross-platform default and preserves a configured value', () => {
    expect(coerceKioskExitShortcut(undefined)).toBe(DEFAULT_KIOSK_EXIT_SHORTCUT)
    expect(coerceKioskExitShortcut('  Command+Alt+Q  ')).toBe('Command+Alt+Q')
  })

  it('rejects empty user input without replacing it with the default', () => {
    expect(parseKioskExitShortcutInput('   ')).toBeNull()
    expect(parseKioskExitShortcutInput(' Control+Shift+Q ')).toBe(
      'Control+Shift+Q'
    )
  })

  it('migrates old configs to the default and preserves saved shortcuts', () => {
    expect(createDefaultConfig().kioskExitShortcut).toBe(
      DEFAULT_KIOSK_EXIT_SHORTCUT
    )
    expect(
      coerceConfig({ kioskExitShortcut: 'Command+Alt+Q' }).kioskExitShortcut
    ).toBe('Command+Alt+Q')
    expect(coerceConfig({}).kioskExitShortcut).toBe(DEFAULT_KIOSK_EXIT_SHORTCUT)
  })
})

describe('Kiosk exit shortcut controller', () => {
  it('registers the configured accelerator and runs the exit callback', () => {
    const { registrations, registrar } = createRegistrar()
    const onExit = vi.fn()
    const controller = createKioskExitShortcutController(
      registrar as never,
      onExit
    )

    expect(controller.set('Command+Shift+K')).toEqual({
      ok: true,
      settings: {
        accelerator: 'Command+Shift+K',
        registered: true
      }
    })

    registrations.get('Command+Shift+K')?.()
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('keeps the previous shortcut when a replacement is unavailable', () => {
    const { registrations, registrar } = createRegistrar(
      new Set(['Command+Shift+X'])
    )
    const controller = createKioskExitShortcutController(
      registrar as never,
      vi.fn()
    )

    expect(controller.set('Command+Shift+K').ok).toBe(true)
    expect(controller.set('Command+Shift+X')).toMatchObject({
      ok: false,
      reason: 'unavailable'
    })
    expect(registrations.has('Command+Shift+K')).toBe(true)
    expect(controller.getActiveAccelerator()).toBe('Command+Shift+K')
  })

  it('releases the previous shortcut after a replacement succeeds', () => {
    const { registrations, registrar } = createRegistrar()
    const controller = createKioskExitShortcutController(
      registrar as never,
      vi.fn()
    )

    expect(controller.set('Command+Shift+K').ok).toBe(true)
    expect(controller.set('Command+Shift+X').ok).toBe(true)

    expect(registrations.has('Command+Shift+K')).toBe(false)
    expect(registrations.has('Command+Shift+X')).toBe(true)
    expect(registrar.unregister).toHaveBeenCalledWith('Command+Shift+K')
    expect(controller.getActiveAccelerator()).toBe('Command+Shift+X')
  })

  it('reports invalid accelerators without releasing the active shortcut', () => {
    const { registrations, registrar } = createRegistrar()
    const controller = createKioskExitShortcutController(
      registrar as never,
      vi.fn()
    )

    expect(controller.set('Command+Shift+K').ok).toBe(true)
    expect(controller.set('Invalid')).toMatchObject({
      ok: false,
      reason: 'invalid'
    })
    expect(registrations.has('Command+Shift+K')).toBe(true)
  })

  it('unregisters its active shortcut during shutdown', () => {
    const { registrations, registrar } = createRegistrar()
    const controller = createKioskExitShortcutController(
      registrar as never,
      vi.fn()
    )

    controller.set('Command+Shift+K')
    controller.deactivate()

    expect(registrations.size).toBe(0)
    expect(controller.getActiveAccelerator()).toBeNull()
  })
})

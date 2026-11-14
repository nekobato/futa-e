import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive } from 'vue'
import { ElButton, ElInput } from 'element-plus'
import KioskShortcutSettingsPanel from '../../src/components/control/KioskShortcutSettingsPanel.vue'
import { DEFAULT_KIOSK_EXIT_SHORTCUT } from '../../src/shared/kiosk-exit-shortcut'
import type { KioskExitShortcutSettings } from '../../src/shared/ipc'

const cleanups: Array<() => void> = []

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup())
})

const mountPanel = async (isMac = true) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
    isMac ? 'Macintosh' : 'Windows'
  )
  const props = reactive({
    settings: {
      accelerator: DEFAULT_KIOSK_EXIT_SHORTCUT,
      registered: true
    } as KioskExitShortcutSettings,
    pending: false,
    errorMessage: ''
  })
  const onUpdate = vi.fn()
  const container = document.createElement('div')
  document.body.append(container)
  const app = createApp({
    render: () => h(KioskShortcutSettingsPanel, { ...props, onUpdate })
  })
  app.component('ElInput', ElInput)
  app.component('ElButton', ElButton)
  app.mount(container)
  cleanups.push(() => {
    app.unmount()
    container.remove()
  })
  await nextTick()

  const input = container.querySelector('input')!
  const pressKey = async (init: KeyboardEventInit) => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      ...init
    })
    input.dispatchEvent(event)
    await nextTick()
    return event
  }
  const submit = async () => {
    input.blur()
    await nextTick()
    container.querySelector('form')!.requestSubmit()
    await nextTick()
  }

  return { container, input, onUpdate, pressKey, props, submit }
}

describe('Kiosk shortcut recorder integration', () => {
  it.each([
    [true, '⇧⌘K'],
    [false, 'Ctrl + Shift + K']
  ])(
    'displays the saved shortcut for macOS=%s without rewriting it',
    async (isMac, display) => {
      const { input, submit, onUpdate } = await mountPanel(isMac)
      expect(input.value).toBe(display)
      expect(input.readOnly).toBe(true)

      await submit()
      expect(onUpdate).toHaveBeenCalledExactlyOnceWith(
        DEFAULT_KIOSK_EXIT_SHORTCUT
      )
    }
  )

  it('records through the real library and registers only after submission', async () => {
    const { input, onUpdate, pressKey, submit } = await mountPanel()
    input.focus()
    await pressKey({ key: 'J', code: 'KeyJ', metaKey: true, shiftKey: true })

    expect(input.value).toBe('⇧⌘J')
    expect(onUpdate).not.toHaveBeenCalled()
    await submit()
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('Command+Shift+J')
  })

  it('cancels a modifier preview with Escape and restores the confirmed value', async () => {
    const { input, pressKey, submit, onUpdate } = await mountPanel()
    input.focus()
    await pressKey({ key: 'Alt', code: 'AltLeft', altKey: true })
    expect(input.value).toBe('⌥')

    await pressKey({ key: 'Escape', code: 'Escape' })
    expect(input.value).toBe('⇧⌘K')
    await submit()
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(
      DEFAULT_KIOSK_EXIT_SHORTCUT
    )
  })

  it.each(['Backspace', 'Delete'])(
    'clears with %s without unregistering the saved shortcut',
    async (key) => {
      const { container, input, onUpdate, pressKey, submit } =
        await mountPanel()
      input.focus()
      await pressKey({ key, code: key })
      expect(input.value).toBe('')

      await submit()
      expect(onUpdate).not.toHaveBeenCalled()
      expect(input.getAttribute('aria-invalid')).toBe('true')
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        'ショートカットを入力してください。'
      )
    }
  )

  it.each([false, true])(
    'keeps Tab navigation available with Shift=%s',
    async (shiftKey) => {
      const { input, pressKey, submit, onUpdate } = await mountPanel()
      input.focus()
      const event = await pressKey({ key: 'Tab', code: 'Tab', shiftKey })

      expect(event.defaultPrevented).toBe(false)
      expect(input.value).toBe('⇧⌘K')
      await submit()
      expect(onUpdate).toHaveBeenCalledExactlyOnceWith(
        DEFAULT_KIOSK_EXIT_SHORTCUT
      )
    }
  )

  it('stops recording and blocks duplicate requests during registration', async () => {
    const { props, input, onUpdate, submit } = await mountPanel()
    input.focus()
    props.pending = true
    await nextTick()

    expect(input.disabled).toBe(true)
    await submit()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('keeps a failed draft and clears its registration error when a new shortcut is captured', async () => {
    const { props, container, input, onUpdate, pressKey, submit } =
      await mountPanel()
    input.focus()
    await pressKey({ key: 'J', code: 'KeyJ', metaKey: true, shiftKey: true })
    await submit()
    props.errorMessage = '登録できませんでした。'
    await nextTick()

    expect(input.value).toBe('⇧⌘J')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      '登録できませんでした。'
    )
    input.focus()
    await pressKey({ key: 'L', code: 'KeyL', metaKey: true, shiftKey: true })
    expect(container.querySelector('[role="alert"]')).toBeNull()
    await submit()
    expect(onUpdate).toHaveBeenLastCalledWith('Command+Shift+L')
  })

  it('preserves drafts on unchanged refreshes and shows externally changed settings', async () => {
    const { props, input, pressKey } = await mountPanel()
    input.focus()
    await pressKey({ key: 'J', code: 'KeyJ', metaKey: true, shiftKey: true })
    props.settings = { ...props.settings }
    await nextTick()
    expect(input.value).toBe('⇧⌘J')

    props.settings = { accelerator: 'Command+Alt+Q', registered: true }
    await nextTick()
    expect(input.value).toBe('⌥⌘Q')
  })

  it('rejects unsupported recorded keys without submitting the previous value', async () => {
    const { container, input, onUpdate, pressKey, submit } = await mountPanel()
    input.focus()
    await pressKey({ key: 'ろ', code: 'IntlRo' })
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'このキーは登録できません。'
    )
    await submit()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('can clear a saved accelerator that only supports the original text display', async () => {
    const { props, input, onUpdate, pressKey, submit } = await mountPanel(false)
    props.settings = { accelerator: 'AltGr+K', registered: true }
    await nextTick()
    expect(input.value).toBe('AltGr+K')

    input.focus()
    await pressKey({ key: 'Backspace', code: 'Backspace' })
    expect(input.value).toBe('')
    await submit()
    expect(onUpdate).not.toHaveBeenCalled()
  })
})

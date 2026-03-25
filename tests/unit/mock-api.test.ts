import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBrowserMockApi } from '../../src/shared/mock-api'

type FakeScreenInput = {
  height: number
  isPrimary?: boolean
  label?: string
  left?: number
  top?: number
  width: number
}

const createFakeScreen = (
  input: FakeScreenInput
): WindowManagementDetailedScreen =>
  ({
    availLeft: input.left ?? 0,
    availTop: input.top ?? 0,
    height: input.height,
    isPrimary: input.isPrimary,
    label: input.label,
    left: input.left ?? 0,
    top: input.top ?? 0,
    width: input.width
  }) as WindowManagementDetailedScreen

const createFakeScreenDetails = (
  screens: WindowManagementDetailedScreen[]
): WindowManagementScreenDetails => {
  const details = new EventTarget() as WindowManagementScreenDetails
  details.screens = screens
  details.currentScreen = screens[0]
  return details
}

describe('browser mock displays', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete window.getScreenDetails
  })

  it('uses Window Management API screens when available', async () => {
    const details = createFakeScreenDetails([
      createFakeScreen({
        label: 'Built-in Display',
        isPrimary: true,
        left: 0,
        top: 0,
        width: 1512,
        height: 982
      }),
      createFakeScreen({
        label: 'Studio Display',
        left: 1512,
        top: 0,
        width: 2560,
        height: 1440
      })
    ])

    window.getScreenDetails = vi.fn().mockResolvedValue(details)

    const displays = await createBrowserMockApi().displays.list()

    expect(displays).toEqual([
      {
        id: 'display-1-0-0-1512x982',
        label: 'Built-in Display',
        isPrimary: true,
        bounds: { x: 0, y: 0, width: 1512, height: 982 }
      },
      {
        id: 'display-2-1512-0-2560x1440',
        label: 'Studio Display',
        isPrimary: false,
        bounds: { x: 1512, y: 0, width: 2560, height: 1440 }
      }
    ])
  })

  it('falls back to the current browser screen instead of fake dual displays', async () => {
    vi.spyOn(window, 'screen', 'get').mockReturnValue(
      createFakeScreen({
        label: 'Current Screen',
        isPrimary: true,
        left: 0,
        top: 0,
        width: 1280,
        height: 720
      })
    )

    const displays = await createBrowserMockApi().displays.list()

    expect(displays).toEqual([
      {
        id: 'display-1-0-0-1280x720',
        label: 'Current Screen',
        isPrimary: true,
        bounds: { x: 0, y: 0, width: 1280, height: 720 }
      }
    ])
  })

  it('notifies listeners when available screens change', async () => {
    const details = createFakeScreenDetails([
      createFakeScreen({
        label: 'Built-in Display',
        isPrimary: true,
        left: 0,
        top: 0,
        width: 1512,
        height: 982
      })
    ])
    const addEventListenerSpy = vi.spyOn(details, 'addEventListener')

    window.getScreenDetails = vi.fn().mockResolvedValue(details)

    const handler = vi.fn()
    const stop = createBrowserMockApi().displays.onChanged(handler)

    await vi.waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'screenschange',
        expect.any(Function)
      )
    })

    details.screens = [
      createFakeScreen({
        label: 'Built-in Display',
        isPrimary: true,
        left: 0,
        top: 0,
        width: 1512,
        height: 982
      }),
      createFakeScreen({
        label: 'Projector',
        left: 1512,
        top: 0,
        width: 1920,
        height: 1080
      })
    ]
    details.dispatchEvent(new Event('screenschange'))

    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1)
    })

    expect(handler).toHaveBeenCalledWith([
      {
        id: 'display-1-0-0-1512x982',
        label: 'Built-in Display',
        isPrimary: true,
        bounds: { x: 0, y: 0, width: 1512, height: 982 }
      },
      {
        id: 'display-2-1512-0-1920x1080',
        label: 'Projector',
        isPrimary: false,
        bounds: { x: 1512, y: 0, width: 1920, height: 1080 }
      }
    ])

    stop()
  })
})

describe('browser mock assets', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('opens a browser file picker and returns selected assets', async () => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      (file) => `blob:${(file as File).name}`
    )
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(
      () => undefined
    )

    const promise = createBrowserMockApi().assets.pickFiles({ kind: 'image' })

    let picker: HTMLInputElement | null = null
    await vi.waitFor(() => {
      picker = document.body.querySelector('input[type="file"]')
      expect(picker).not.toBeNull()
    })
    const fileInput = picker!

    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [
        new File(['image'], 'hero.png', { type: 'image/png' }),
        new File(['video'], 'intro.mp4', { type: 'video/mp4' })
      ]
    })
    fileInput.dispatchEvent(new Event('change'))

    await expect(promise).resolves.toEqual([
      {
        path: 'blob:hero.png',
        type: 'image',
        name: 'hero.png'
      }
    ])
  })

  it('returns an empty list when the picker is closed without a selection', async () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(
      () => undefined
    )

    const promise = createBrowserMockApi().assets.pickFiles({ kind: 'video' })

    let picker: HTMLInputElement | null = null
    await vi.waitFor(() => {
      picker = document.body.querySelector('input[type="file"]')
      expect(picker).not.toBeNull()
    })
    const fileInput = picker!

    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: []
    })
    window.dispatchEvent(new Event('focus'))

    await expect(promise).resolves.toEqual([])
  })
})

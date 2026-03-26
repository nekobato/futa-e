import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutoSaveController } from '../../src/shared/config-autosave'

type FakeConfig = {
  name: string
  updatedAt: string
}

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('config auto save controller', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('persists the latest config after the debounce interval', async () => {
    const source = ref<FakeConfig>({
      name: 'before',
      updatedAt: 'initial'
    })
    const persist = vi.fn(async (value: FakeConfig) => ({
      ...value,
      updatedAt: 'saved'
    }))

    const controller = createAutoSaveController({
      delayMs: 150,
      persist,
      source
    })
    controller.resume()

    source.value = {
      name: 'after',
      updatedAt: 'initial'
    }

    await vi.advanceTimersByTimeAsync(149)
    expect(persist).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await flushMicrotasks()

    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist).toHaveBeenCalledWith({
      name: 'after',
      updatedAt: 'initial'
    })
    expect(source.value).toEqual({
      name: 'after',
      updatedAt: 'saved'
    })
  })

  it('does not overwrite newer edits while a save is in flight', async () => {
    const source = ref<FakeConfig>({
      name: 'before',
      updatedAt: 'initial'
    })
    let resolveFirstSave!: () => void
    const persist = vi
      .fn<(value: FakeConfig) => Promise<FakeConfig>>()
      .mockImplementationOnce(
        (value) =>
          new Promise((resolve) => {
            resolveFirstSave = () =>
              resolve({
                ...value,
                updatedAt: 'saved-1'
              })
          })
      )
      .mockImplementationOnce(async (value) => ({
        ...value,
        updatedAt: 'saved-2'
      }))

    const controller = createAutoSaveController({
      delayMs: 0,
      persist,
      source
    })
    controller.resume()

    source.value = {
      name: 'first',
      updatedAt: 'initial'
    }
    await flushMicrotasks()

    source.value = {
      name: 'second',
      updatedAt: 'initial'
    }
    await flushMicrotasks()

    resolveFirstSave()
    await flushMicrotasks()
    await vi.runAllTimersAsync()
    await flushMicrotasks()

    expect(persist).toHaveBeenCalledTimes(2)
    expect(persist).toHaveBeenNthCalledWith(1, {
      name: 'first',
      updatedAt: 'initial'
    })
    expect(persist).toHaveBeenNthCalledWith(2, {
      name: 'second',
      updatedAt: 'initial'
    })
    expect(source.value).toEqual({
      name: 'second',
      updatedAt: 'saved-2'
    })
  })
})

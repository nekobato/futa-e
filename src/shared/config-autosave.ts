import { watch, type Ref } from 'vue'

type SnapshotFn<T> = (value: T) => string
type PersistFn<T> = (value: T) => Promise<T>

export type AutoSaveController<T> = {
  flush: () => Promise<void>
  pause: () => void
  resume: (value?: T) => void
  stop: () => void
  touch: () => void
}

type CreateAutoSaveControllerOptions<T> = {
  delayMs?: number
  onError?: (error: unknown) => void
  persist: PersistFn<T>
  snapshot?: SnapshotFn<T>
  source: Ref<T>
}

const defaultSnapshot = <T>(value: T): string => JSON.stringify(value)

export const createAutoSaveController = <T>({
  delayMs = 150,
  onError,
  persist,
  snapshot = defaultSnapshot,
  source
}: CreateAutoSaveControllerOptions<T>): AutoSaveController<T> => {
  let paused = true
  let lastPersisted = snapshot(source.value)
  let scheduledSave: ReturnType<typeof setTimeout> | null = null
  let activeSave: Promise<void> | null = null
  let rerunAfterSave = false

  const clearScheduledSave = () => {
    if (scheduledSave) {
      clearTimeout(scheduledSave)
      scheduledSave = null
    }
  }

  const schedulePersist = () => {
    clearScheduledSave()

    if (delayMs <= 0) {
      void persistLatest().catch((error) => {
        onError?.(error)
      })
      return
    }

    scheduledSave = setTimeout(() => {
      scheduledSave = null
      void persistLatest().catch((error) => {
        onError?.(error)
      })
    }, delayMs)
  }

  const touch = () => {
    if (paused) {
      return
    }

    if (snapshot(source.value) === lastPersisted) {
      return
    }

    if (activeSave) {
      rerunAfterSave = true
      return
    }

    schedulePersist()
  }

  const persistLatest = async (): Promise<void> => {
    clearScheduledSave()

    if (paused) {
      return
    }

    const snapshotBeforeSave = snapshot(source.value)
    if (snapshotBeforeSave === lastPersisted) {
      return
    }

    if (activeSave) {
      rerunAfterSave = true
      return activeSave
    }

    activeSave = (async () => {
      const persisted = await persist(source.value)
      const persistedSnapshot = snapshot(persisted)
      const currentSnapshot = snapshot(source.value)

      lastPersisted = persistedSnapshot

      if (currentSnapshot !== snapshotBeforeSave) {
        rerunAfterSave = true
        return
      }

      paused = true
      try {
        source.value = persisted
      } finally {
        paused = false
      }
    })()

    try {
      await activeSave
    } finally {
      activeSave = null

      const shouldRerun = rerunAfterSave
      rerunAfterSave = false

      if (!shouldRerun || paused || snapshot(source.value) === lastPersisted) {
        return
      }

      schedulePersist()
    }
  }

  const stopWatching = watch(
    () => snapshot(source.value),
    () => {
      touch()
    }
  )

  return {
    flush: async () => {
      clearScheduledSave()

      if (activeSave) {
        await activeSave
      }

      if (paused || snapshot(source.value) === lastPersisted) {
        return
      }

      await persistLatest()
    },
    pause: () => {
      paused = true
      clearScheduledSave()
    },
    resume: (value = source.value) => {
      lastPersisted = snapshot(value)
      paused = false
    },
    stop: () => {
      paused = true
      clearScheduledSave()
      stopWatching()
    },
    touch
  }
}

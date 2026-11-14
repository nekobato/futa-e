import { onMounted, onScopeDispose, readonly, ref, watch } from 'vue'
import type { UseRecordHotkeyReturn } from 'v-record-hotkey'

type ShortcutRecordingOptions = {
  input: () => HTMLInputElement | undefined
  recorder: Pick<UseRecordHotkeyReturn, 'isRecording' | 'start' | 'cancel'>
  setRecording: (recording: boolean) => Promise<void>
  onError: (message: string) => void
}

/** Keeps the native shortcut suspended only while the input records keys. */
export const useKioskShortcutRecording = ({
  input,
  recorder,
  setRecording,
  onError
}: ShortcutRecordingOptions) => {
  const isStarting = ref(false)
  let requested = false
  let requestId = 0
  let disposed = false
  let resumeTask = Promise.resolve(true)

  const resume = () => {
    if (!requested) return

    requested = false
    isStarting.value = false
    requestId += 1
    resumeTask = setRecording(false).then(
      () => true,
      (error) => {
        console.error('Failed to resume the Kiosk exit shortcut.', error)
        if (!disposed) onError('ショートカットを復元できませんでした。')
        return false
      }
    )
  }

  const cancel = () => {
    recorder.cancel()
    resume()
  }

  const start = async () => {
    if (requested || disposed) return

    requested = true
    isStarting.value = true
    const currentRequest = ++requestId

    try {
      await setRecording(true)
      if (currentRequest !== requestId) return

      isStarting.value = false
      if (document.activeElement !== input()) {
        cancel()
        return
      }

      recorder.start()
    } catch (error) {
      if (currentRequest !== requestId) return

      console.error('Failed to suspend the Kiosk exit shortcut.', error)
      cancel()
      onError('キー入力の記録を開始できませんでした。')
    }
  }

  watch(
    recorder.isRecording,
    (recording) => {
      if (!recording) resume()
    },
    { flush: 'sync' }
  )

  onMounted(() => {
    window.addEventListener('blur', cancel)
    window.addEventListener('pagehide', cancel)
  })
  onScopeDispose(() => {
    disposed = true
    cancel()
    window.removeEventListener('blur', cancel)
    window.removeEventListener('pagehide', cancel)
  })

  const readyForSubmission = async () => {
    if (requested || disposed) return false

    const currentRequest = requestId
    const resumed = await resumeTask
    return resumed && currentRequest === requestId && !requested && !disposed
  }

  return {
    isStarting: readonly(isStarting),
    start,
    cancel,
    readyForSubmission
  }
}

<template>
  <section class="kiosk-shortcut-settings">
    <header class="header">
      <h2>Kiosk終了</h2>
    </header>

    <form class="card" @submit.prevent="handleSubmit">
      <div class="copy">
        <label :for="inputId">グローバルショートカット</label>
        <p :id="descriptionId" class="note">
          入力欄を選び、使いたいキーの組み合わせを押してください。
        </p>
        <p
          :id="recordingStatusId"
          class="note"
          role="status"
          aria-live="polite"
        >
          {{
            isRecording
              ? 'キー入力を待っています。Escapeで取り消せます。'
              : 'Escapeで取消、Backspace / Deleteで入力を消去できます。'
          }}
        </p>
        <p
          :id="statusId"
          class="status"
          :class="{ 'is-error': !settings.registered }"
          role="status"
          aria-live="polite"
        >
          {{ statusMessage }}
        </p>
        <p v-if="visibleError" :id="errorId" class="error" role="alert">
          {{ visibleError }}
        </p>
      </div>

      <div class="form-controls">
        <ElInput
          :id="inputId"
          ref="shortcutInput"
          name="kiosk-exit-shortcut"
          :model-value="displayValue || draft"
          readonly
          :disabled="pending"
          placeholder="クリックしてキーを入力"
          autocomplete="off"
          spellcheck="false"
          :aria-describedby="descriptionIds"
          :aria-invalid="visibleError ? 'true' : 'false'"
          @keydown.capture="handleInputKeydown"
        />
        <ElButton native-type="submit" type="primary" :loading="pending">
          登録
        </ElButton>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import type { InputInstance } from 'element-plus'
import { useRecordHotkey } from 'v-record-hotkey'
import type { KioskExitShortcutSettings } from '../../shared/ipc'
import {
  acceleratorToHotkey,
  hotkeyToAccelerator
} from '../../shared/hotkey-accelerator'
import { parseKioskExitShortcutInput } from '../../shared/kiosk-exit-shortcut'
import { createId } from '../../shared/utils'

const { settings, pending, errorMessage } = defineProps<{
  settings: KioskExitShortcutSettings
  pending: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  update: [accelerator: string]
}>()

const inputId = createId()
const descriptionId = createId()
const recordingStatusId = createId()
const statusId = createId()
const errorId = createId()
const draft = ref(settings.accelerator)
const submittedAccelerator = ref(settings.accelerator)
const localError = ref('')
const shortcutInput = useTemplateRef<InputInstance>('shortcutInput')
const isMac = /mac|darwin/i.test(navigator.userAgent || navigator.platform)
const {
  value: recordedHotkey,
  displayValue,
  isRecording,
  cancel
} = useRecordHotkey(() => shortcutInput.value?.input, {
  initial: acceleratorToHotkey(settings.accelerator, isMac),
  onStart: () => {
    localError.value = ''
  },
  onConfirm: (hotkey) => {
    draft.value = hotkeyToAccelerator(hotkey, isMac) ?? ''
    localError.value = draft.value
      ? ''
      : 'このキーは登録できません。別の組み合わせを入力してください。'
  },
  onClear: () => {
    draft.value = ''
    localError.value = ''
  }
})

const visibleError = computed(
  () =>
    localError.value ||
    (draft.value === submittedAccelerator.value ? errorMessage : '')
)
const descriptionIds = computed(() =>
  [
    descriptionId,
    recordingStatusId,
    statusId,
    visibleError.value ? errorId : ''
  ]
    .filter(Boolean)
    .join(' ')
)
const statusMessage = computed(() =>
  settings.registered
    ? '登録済みです。Futa Eが前面になくてもKioskを終了できます。'
    : '現在は登録されていません。別の組み合わせを登録してください。'
)

watch(
  () => settings.accelerator,
  (accelerator) => {
    cancel()
    recordedHotkey.value = acceleratorToHotkey(accelerator, isMac)
    draft.value = accelerator
    submittedAccelerator.value = accelerator
    localError.value = ''
  }
)

watch(
  () => pending,
  (isPending) => {
    if (isPending) cancel()
  }
)

/** Keeps Tab and Shift+Tab available for moving between form controls. */
const handleInputKeydown = (event: Event) => {
  if (!(event instanceof KeyboardEvent)) return

  if (
    event.key === 'Tab' &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey
  ) {
    cancel()
    event.stopImmediatePropagation()
  }

  // A saved accelerator may not have a RecordedHotkey representation yet.
  if (
    !recordedHotkey.value &&
    (event.key === 'Backspace' || event.key === 'Delete') &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    !event.metaKey
  ) {
    draft.value = ''
    localError.value = ''
  }
}

/** Validates the required value before asking Electron to register it. */
const handleSubmit = () => {
  if (pending || isRecording.value) return

  const accelerator = parseKioskExitShortcutInput(draft.value)
  if (!accelerator) {
    localError.value ||= 'ショートカットを入力してください。'
    return
  }

  draft.value = accelerator
  submittedAccelerator.value = accelerator
  emit('update', accelerator)
}
</script>

<style scoped lang="scss">
.kiosk-shortcut-settings {
  display: grid;
  gap: 16px;
  padding-top: 8px;
}

.header {
  padding-left: 16px;

  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 16px;
    line-height: 1;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: var(--ink);
  }
}

.card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 28px;
  padding: 18px 20px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-card);
  background: color-mix(in srgb, var(--surface-strong), var(--panel) 10%);
}

.copy {
  display: grid;
  gap: 5px;
  min-width: 0;

  label {
    font-weight: 600;
    letter-spacing: 0.01em;
  }
}

.note,
.status,
.error {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
}

.note {
  color: var(--muted);
}

.status {
  color: var(--success, #287a4b);
}

.status.is-error,
.error {
  color: var(--danger, #b42318);
}

.form-controls {
  display: grid;
  grid-template-columns: minmax(280px, 360px) auto;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}
</style>

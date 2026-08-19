<template>
  <section class="kiosk-shortcut-settings">
    <header class="header">
      <h2>Kiosk終了</h2>
    </header>

    <form class="card" @submit.prevent="handleSubmit">
      <div class="copy">
        <label :for="inputId">グローバルショートカット</label>
        <p :id="descriptionId" class="note">
          Electronのaccelerator形式で入力します。例:
          <code>CommandOrControl+Shift+K</code>
        </p>
        <p :id="platformNoteId" class="note">
          macOSでは<code>CommandOrControl</code>がCommand、<code>Alt</code>がOptionに対応します。
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
          name="kiosk-exit-shortcut"
          :model-value="draft"
          :maxlength="MAX_KIOSK_EXIT_SHORTCUT_LENGTH"
          autocomplete="off"
          spellcheck="false"
          :aria-describedby="descriptionIds"
          :aria-invalid="visibleError ? 'true' : 'false'"
          @update:model-value="handleInput"
        />
        <ElButton native-type="submit" type="primary" :loading="pending">
          登録
        </ElButton>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { KioskExitShortcutSettings } from '../../shared/ipc'
import {
  MAX_KIOSK_EXIT_SHORTCUT_LENGTH,
  parseKioskExitShortcutInput
} from '../../shared/kiosk-exit-shortcut'
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
const platformNoteId = createId()
const statusId = createId()
const errorId = createId()
const draft = ref(settings.accelerator)
const submittedAccelerator = ref(settings.accelerator)
const localError = ref('')

const visibleError = computed(
  () =>
    localError.value ||
    (draft.value === submittedAccelerator.value ? errorMessage : '')
)
const descriptionIds = computed(() =>
  [descriptionId, platformNoteId, statusId, visibleError.value ? errorId : '']
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
    draft.value = accelerator
    submittedAccelerator.value = accelerator
    localError.value = ''
  }
)

/** Clears local validation feedback as soon as the user edits the value. */
const handleInput = (value: string) => {
  draft.value = value
  localError.value = ''
}

/** Validates the required value before asking Electron to register it. */
const handleSubmit = () => {
  const accelerator = parseKioskExitShortcutInput(draft.value)
  if (!accelerator) {
    localError.value = 'ショートカットを入力してください。'
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

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.95em;
}
</style>

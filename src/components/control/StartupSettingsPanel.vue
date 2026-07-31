<template>
  <section class="startup-settings">
    <header class="startup-settings-header">
      <h2>起動</h2>
    </header>

    <div class="startup-settings-card">
      <div class="startup-settings-copy">
        <label :for="launchAtLoginInputId">OSログイン時にFuta-eを起動</label>
        <p :id="launchAtLoginDescriptionId" class="surface-note">
          操作画面とメニューバーだけを起動します。Kiosk再生は自動開始しません。
        </p>
        <p
          v-if="!settings.supported"
          :id="launchAtLoginSupportId"
          class="surface-note"
        >
          パッケージ化したmacOSアプリで設定できます。
        </p>
        <p v-if="errorMessage" class="startup-settings-error" role="alert">
          {{ errorMessage }}
        </p>
      </div>

      <div class="startup-settings-control">
        <ElSwitch
          :id="launchAtLoginInputId"
          :model-value="settings.enabled"
          :disabled="!settings.supported || pending"
          :aria-describedby="launchAtLoginDescriptionIds"
          @update:model-value="handleUpdate($event)"
        />
        <span
          v-if="pending"
          class="surface-note"
          role="status"
          aria-live="polite"
        >
          適用中
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LaunchAtLoginSettings } from '../../shared/ipc'
import { createId } from '../../shared/utils'

const props = defineProps<{
  settings: LaunchAtLoginSettings
  pending: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  update: [enabled: boolean]
}>()

const launchAtLoginInputId = createId()
const launchAtLoginDescriptionId = createId()
const launchAtLoginSupportId = createId()
const launchAtLoginDescriptionIds = computed(() =>
  props.settings.supported
    ? launchAtLoginDescriptionId
    : `${launchAtLoginDescriptionId} ${launchAtLoginSupportId}`
)

/** Narrows Element Plus' configurable switch value to this boolean model. */
const handleUpdate = (enabled: string | number | boolean) => {
  emit('update', enabled === true)
}
</script>

<style lang="scss">
.startup-settings {
  display: grid;
  gap: 16px;
  padding-top: 8px;

  &-header {
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

  &-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    padding: 18px 20px;
    border-radius: var(--radius-card);
    border: 1px solid var(--line-strong);
    background: color-mix(in srgb, var(--surface-strong), var(--panel) 10%);
  }

  &-copy {
    display: grid;
    gap: 5px;
    min-width: 0;

    label {
      font-weight: 600;
      letter-spacing: 0.01em;
    }
  }

  &-control {
    display: grid;
    justify-items: center;
    gap: 5px;
    flex: 0 0 auto;
  }

  .surface-note,
  &-error {
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
  }

  .surface-note {
    color: var(--muted);
  }

  &-error {
    color: var(--danger, #b42318);
  }
}
</style>

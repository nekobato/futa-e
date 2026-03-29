<template>
  <section class="display-settings">
    <header class="display-settings-header">
      <h2>ディスプレイ</h2>
    </header>

    <div v-if="displayInfos.length > 0" class="display-list">
      <div
        v-for="display in displayInfos"
        :key="display.id"
        class="display-summary"
      >
        <div class="display-copy">
          <strong>{{ display.label }}</strong>
          <span class="surface-note">
            {{ display.bounds.width }} x {{ display.bounds.height }}
          </span>
        </div>

        <div class="display-summary-actions">
          <Tag
            :value="display.isPrimary ? 'メイン' : '画面'"
            severity="secondary"
          />
          <div class="display-toggle">
            <label :for="displayEnabledInputId(display.id)">有効</label>
            <ToggleSwitch
              :inputId="displayEnabledInputId(display.id)"
              :modelValue="isDisplayEnabled(display.id)"
              @update:modelValue="
                emit('toggle-display', display.id, Boolean($event))
              "
            />
          </div>
        </div>
      </div>
    </div>

    <p v-else class="surface-note">ディスプレイはまだ検出できておりません。</p>
  </section>
</template>

<script setup lang="ts">
import type { DisplayInfo, PlayerConfig } from '../../shared/types'

const props = defineProps<{
  displayInfos: DisplayInfo[]
  displays: PlayerConfig['displays']
}>()

const emit = defineEmits<{
  'toggle-display': [displayId: string, enabled: boolean]
}>()

/** Builds a stable input id for a display toggle. */
const displayEnabledInputId = (displayId: string) =>
  `display-enabled-${displayId}`

/** Resolves the current enabled state for a display. */
const isDisplayEnabled = (displayId: string) =>
  props.displays[displayId]?.enabled ?? true
</script>

<style lang="scss">
.display-settings {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid var(--line-strong);
  background: var(--panel-soft-strong);

  &-header {
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--ink);
    }
  }

  .surface-note {
    font-size: 12.5px;
    color: var(--muted);
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .display-list {
    display: grid;
    gap: 12px;
  }

  .display-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--line-strong);
    background: color-mix(in srgb, var(--p-surface-0), transparent 12%);
  }

  .display-copy {
    display: grid;
    gap: 4px;
    min-width: 0;

    strong {
      font-size: 15px;
      min-width: 0;
      text-wrap: balance;
    }
  }

  .display-summary-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }

  .display-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 10px;
    background: var(--panel-soft-strong);

    label {
      font-weight: 600;
      letter-spacing: 0.01em;
    }
  }
}
</style>

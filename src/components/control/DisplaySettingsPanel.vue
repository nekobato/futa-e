<template>
  <section class="display-settings">
    <header class="display-settings-header">
      <h2>接続ディスプレイ</h2>
    </header>

    <div v-if="displayInfos.length > 0" class="display-list">
      <article
        v-for="display in displayInfos"
        :key="display.id"
        class="display-summary"
      >
        <div class="display-icon" aria-hidden="true">
          <i class="pi pi-desktop"></i>
        </div>

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
      </article>
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
  gap: 18px;
  padding: 8px 10px 0;
  justify-items: center;

  &-header {
    display: grid;
    gap: 0;
    justify-items: center;
    text-align: center;

    h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(30px, 3vw, 42px);
      line-height: 0.95;
      font-weight: 700;
      letter-spacing: 0.01em;
      color: var(--ink);
    }
  }

  .surface-note {
    margin: 0;
    font-size: 12.5px;
    color: var(--muted);
    line-height: 1.6;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  .display-list {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
  }

  .display-summary {
    display: grid;
    justify-items: center;
    align-content: start;
    gap: 12px;
    min-height: 160px;
    padding: 18px 18px 16px;
    border-radius: var(--radius-card);
    border: 1px solid var(--line-strong);
    background: color-mix(in srgb, var(--surface-strong), var(--panel) 10%);
  }

  .display-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
    text-align: center;

    strong {
      font-size: 16px;
      font-weight: 600;
      min-width: 0;
      text-wrap: balance;
    }
  }

  .display-icon {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    border: 1px solid var(--line-strong);
    background: color-mix(in srgb, var(--surface-strong), white 45%);
    font-size: 18px;
    color: color-mix(in srgb, var(--ink), var(--accent) 22%);
  }

  .display-summary-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .display-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid var(--line-subtle);
    background: color-mix(in srgb, var(--surface-strong), white 42%);

    label {
      font-weight: 600;
      letter-spacing: 0.01em;
    }
  }
}
</style>

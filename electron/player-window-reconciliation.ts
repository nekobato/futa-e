import type { PlayerConfig } from '../src/shared/types'

type DisplayTarget = {
  id: string | number
}

export type PlayerWindowReconciliationPlan = {
  closeDisplayIds: string[]
  createDisplayIds: string[]
}

/**
 * Selects connected displays that may participate in the current Kiosk run.
 *
 * Displays present when Kiosk starts keep the existing enabled-by-default
 * behavior. Displays connected later require an explicit enabled setting.
 */
export const selectPlayerTargetDisplays = <T extends DisplayTarget>(
  config: PlayerConfig,
  displays: T[],
  initialDisplayIds: ReadonlySet<string>
): T[] =>
  displays.filter((display) => {
    const displayId = String(display.id)
    return (
      config.displays[displayId]?.enabled ?? initialDisplayIds.has(displayId)
    )
  })

/**
 * Calculates the minimal close/create operations for Player windows.
 */
export const planPlayerWindowReconciliation = ({
  desiredDisplayIds,
  existingDisplayIds,
  recreateDisplayIds = new Set<string>()
}: {
  desiredDisplayIds: string[]
  existingDisplayIds: string[]
  recreateDisplayIds?: ReadonlySet<string>
}): PlayerWindowReconciliationPlan => {
  const desired = new Set(desiredDisplayIds)
  const existing = new Set(existingDisplayIds)

  return {
    closeDisplayIds: existingDisplayIds.filter(
      (displayId) =>
        !desired.has(displayId) || recreateDisplayIds.has(displayId)
    ),
    createDisplayIds: desiredDisplayIds.filter(
      (displayId) =>
        !existing.has(displayId) || recreateDisplayIds.has(displayId)
    )
  }
}

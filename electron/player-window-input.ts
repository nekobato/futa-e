type PlayerWindowInput = {
  code?: string
  isAutoRepeat?: boolean
  key?: string
  type?: string
}

type PlayerExitShortcutOptions = {
  now?: () => number
  pressCount?: number
  windowMs?: number
}

const defaultPressCount = 3
const defaultWindowMs = 2000

/** Returns whether the Electron keyboard input is an Escape key press. */
export const shouldBlockPlayerWindowEscape = (
  input: PlayerWindowInput
): boolean =>
  input.type === 'keyDown' &&
  (input.key === 'Escape' || input.code === 'Escape')

/** Returns whether the Escape input should count toward kiosk recovery. */
const shouldCountPlayerWindowEscape = (input: PlayerWindowInput): boolean =>
  shouldBlockPlayerWindowEscape(input) && !input.isAutoRepeat

/** Creates a detector that exits after repeated Escape presses in a time window. */
export const createPlayerExitShortcutDetector = ({
  now = () => Date.now(),
  pressCount = defaultPressCount,
  windowMs = defaultWindowMs
}: PlayerExitShortcutOptions = {}) => {
  let timestamps: number[] = []

  return (input: PlayerWindowInput): boolean => {
    if (!shouldCountPlayerWindowEscape(input)) {
      return false
    }

    const currentTime = now()
    const windowStart = currentTime - windowMs
    timestamps = [...timestamps, currentTime]
      .filter((timestamp) => timestamp >= windowStart)
      .slice(-pressCount)

    const shouldExit = timestamps.length >= pressCount
    if (shouldExit) {
      timestamps = []
    }

    return shouldExit
  }
}

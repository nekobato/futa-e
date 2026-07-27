import type { PlaylistItem, PlaylistItemPlaybackMode } from './types'

/**
 * Describes how the player should leave the current item.
 */
export type PlaybackAdvancePolicy =
  { type: 'hold' } | { type: 'media-end' } | { type: 'timer'; delayMs: number }

/** Checks whether a raw value is a supported playlist item playback mode. */
export const isPlaylistItemPlaybackMode = (
  value: unknown
): value is PlaylistItemPlaybackMode =>
  value === 'auto' || value === 'duration' || value === 'forever'

/** Normalizes a raw playback mode into the persisted default. */
export const normalizePlaylistItemPlaybackMode = (
  value: unknown
): PlaylistItemPlaybackMode =>
  isPlaylistItemPlaybackMode(value) ? value : 'auto'

/** Resolves legacy items without a playback mode into their current behavior. */
export const getItemPlaybackMode = (
  item: Pick<PlaylistItem, 'durationSec' | 'playbackMode'>
): PlaylistItemPlaybackMode => {
  if (isPlaylistItemPlaybackMode(item.playbackMode)) {
    return item.playbackMode
  }

  return typeof item.durationSec === 'number' ? 'duration' : 'auto'
}

/** Returns whether the item should stay on screen until config changes or errors. */
export const isItemHeldForever = (
  item: Pick<PlaylistItem, 'playbackMode'> | null
): boolean => item?.playbackMode === 'forever'

/** Converts an item into the rule that advances playback to the next item. */
export const resolveItemAdvancePolicy = (
  item: Pick<PlaylistItem, 'durationSec' | 'playbackMode' | 'type'>,
  defaultDurationSec: number
): PlaybackAdvancePolicy => {
  const playbackMode = getItemPlaybackMode(item)

  if (playbackMode === 'forever') {
    return { type: 'hold' }
  }

  if (
    playbackMode === 'duration' &&
    typeof item.durationSec === 'number' &&
    Number.isFinite(item.durationSec)
  ) {
    return { type: 'timer', delayMs: item.durationSec * 1000 }
  }

  if (item.type === 'video') {
    return { type: 'media-end' }
  }

  return { type: 'timer', delayMs: defaultDurationSec * 1000 }
}

export const createOrderedIndices = (length: number): number[] =>
  Array.from({ length }, (_value, index) => index)

export const createShuffledIndices = (
  length: number,
  random: () => number = Math.random
): number[] => {
  const indices = createOrderedIndices(length)

  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]]
  }

  return indices
}

export const createPlaybackOrder = (
  length: number,
  shuffle: boolean,
  random: () => number = Math.random
): number[] =>
  shuffle ? createShuffledIndices(length, random) : createOrderedIndices(length)

export const firstPlayablePointer = (
  order: number[],
  excluded: Set<number>
): number | null => {
  const pointer = order.findIndex((itemIndex) => !excluded.has(itemIndex))
  return pointer === -1 ? null : pointer
}

export const nextPlayablePointer = (
  order: number[],
  currentPointer: number,
  excluded: Set<number>
): number | null => {
  for (let pointer = currentPointer + 1; pointer < order.length; pointer += 1) {
    if (!excluded.has(order[pointer])) {
      return pointer
    }
  }

  return null
}

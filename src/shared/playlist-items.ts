import type { PlaylistItem } from './types'
import { getItemPlaybackMode } from './playback'

/**
 * Returns the item index that stops a fixed playback sequence permanently.
 *
 * Shuffle mode has no statically unreachable suffix because its playback order
 * is resolved at runtime.
 */
export const findFixedSequenceStopIndex = (
  items: PlaylistItem[],
  shuffle: boolean
): number =>
  shuffle
    ? -1
    : items.findIndex((item) => getItemPlaybackMode(item) === 'forever')

/**
 * Returns a playlist with one item moved to a concrete sequence slot.
 *
 * The target may equal `items.length` to represent the end insertion target
 * exposed by the horizontal lane editor.
 */
export const movePlaylistItem = (
  items: PlaylistItem[],
  sourceIndex: number,
  targetIndex: number
): PlaylistItem[] => {
  if (
    sourceIndex < 0 ||
    sourceIndex >= items.length ||
    targetIndex < 0 ||
    targetIndex > items.length ||
    sourceIndex === targetIndex
  ) {
    return items
  }

  const next = [...items]
  const [item] = next.splice(sourceIndex, 1)

  if (!item) {
    return items
  }

  next.splice(Math.min(targetIndex, next.length), 0, item)
  return next
}

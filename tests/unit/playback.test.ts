import { describe, expect, it } from 'vitest'
import {
  createPlaybackOrder,
  createShuffledIndices,
  firstPlayablePointer,
  nextPlayablePointer
} from '../../src/shared/playback'

describe('playback helpers', () => {
  it('creates a shuffled cycle without duplicates', () => {
    const order = createShuffledIndices(5, () => 0.42)

    expect(order).toHaveLength(5)
    expect(new Set(order)).toEqual(new Set([0, 1, 2, 3, 4]))
  })

  it('creates sequential order when shuffle is disabled', () => {
    expect(createPlaybackOrder(4, false)).toEqual([0, 1, 2, 3])
  })

  it('finds the first playable pointer that is not excluded', () => {
    expect(firstPlayablePointer([2, 0, 1], new Set([2]))).toBe(1)
  })

  it('finds the next playable pointer and skips excluded indices', () => {
    expect(nextPlayablePointer([0, 1, 2, 3], 0, new Set([1, 2]))).toBe(3)
  })
})

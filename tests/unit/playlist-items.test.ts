import { describe, expect, it } from 'vitest'
import {
  findFixedSequenceStopIndex,
  movePlaylistItem
} from '../../src/shared/playlist-items'
import type { PlaylistItem } from '../../src/shared/types'

const item = (id: string): PlaylistItem => ({
  id,
  type: 'image',
  src: id
})

describe('playlist item ordering', () => {
  it('moves an item to a later sequence slot', () => {
    const items = [item('a'), item('b'), item('c')]

    expect(movePlaylistItem(items, 0, 2).map(({ id }) => id)).toEqual([
      'b',
      'c',
      'a'
    ])
  })

  it('moves an item to an earlier sequence slot', () => {
    const items = [item('a'), item('b'), item('c')]

    expect(movePlaylistItem(items, 2, 0).map(({ id }) => id)).toEqual([
      'c',
      'a',
      'b'
    ])
  })

  it('accepts the end insertion target used by the add card', () => {
    const items = [item('a'), item('b'), item('c')]

    expect(
      movePlaylistItem(items, 0, items.length).map(({ id }) => id)
    ).toEqual(['b', 'c', 'a'])
  })

  it('preserves the original array for invalid moves', () => {
    const items = [item('a'), item('b')]

    expect(movePlaylistItem(items, 0, 0)).toBe(items)
    expect(movePlaylistItem(items, -1, 1)).toBe(items)
    expect(movePlaylistItem(items, 0, 3)).toBe(items)
  })
})

describe('playlist sequence reachability', () => {
  it('finds the first forever item in a fixed sequence', () => {
    const items = [
      item('a'),
      { ...item('b'), playbackMode: 'forever' as const },
      { ...item('c'), playbackMode: 'forever' as const }
    ]

    expect(findFixedSequenceStopIndex(items, false)).toBe(1)
  })

  it('does not mark a static stop point while shuffle is enabled', () => {
    const items = [
      item('a'),
      { ...item('b'), playbackMode: 'forever' as const },
      item('c')
    ]

    expect(findFixedSequenceStopIndex(items, true)).toBe(-1)
  })
})

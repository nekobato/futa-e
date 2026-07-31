import { describe, expect, it } from 'vitest'
import {
  planPlayerWindowReconciliation,
  selectPlayerTargetDisplays
} from '../../electron/player-window-reconciliation'
import { createDefaultConfig } from '../../src/shared/defaults'

describe('Player window reconciliation', () => {
  it('closes removed displays and creates newly desired displays', () => {
    expect(
      planPlayerWindowReconciliation({
        desiredDisplayIds: ['1', '3'],
        existingDisplayIds: ['1', '2']
      })
    ).toEqual({
      closeDisplayIds: ['2'],
      createDisplayIds: ['3']
    })
  })

  it('recreates only displays whose metrics changed', () => {
    expect(
      planPlayerWindowReconciliation({
        desiredDisplayIds: ['1', '2'],
        existingDisplayIds: ['1', '2'],
        recreateDisplayIds: new Set(['2'])
      })
    ).toEqual({
      closeDisplayIds: ['2'],
      createDisplayIds: ['2']
    })
  })

  it('recreates remaining displays while removing a disconnected display', () => {
    expect(
      planPlayerWindowReconciliation({
        desiredDisplayIds: ['1'],
        existingDisplayIds: ['1', '2'],
        recreateDisplayIds: new Set(['1', '2'])
      })
    ).toEqual({
      closeDisplayIds: ['1', '2'],
      createDisplayIds: ['1']
    })
  })

  it('requires explicit opt-in for displays connected after Kiosk starts', () => {
    const config = createDefaultConfig()
    config.displays['3'] = {
      enabled: true,
      playlistEnabled: {
        [config.activePlaylistId]: true
      },
      playlists: config.playlists
    }
    config.displays['4'] = {
      enabled: false,
      playlistEnabled: {
        [config.activePlaylistId]: true
      },
      playlists: config.playlists
    }
    const displays = ['1', '2', '3', '4'].map((id) => ({ id }))

    expect(
      selectPlayerTargetDisplays(config, displays, new Set(['1']))
    ).toEqual([{ id: '1' }, { id: '3' }])
  })
})

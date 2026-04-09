import { computed, onBeforeUnmount, onMounted, ref, toRaw } from 'vue'
import { getFutaeApi } from '../shared/api'
import { createAutoSaveController } from '../shared/config-autosave'
import {
  createDefaultConfig,
  createDefaultPlaylistConfig
} from '../shared/defaults'
import {
  ensureDisplayConfigs,
  getPlaylistById,
  getPrimaryDisplayId,
  replacePlaylistById,
  replacePlaylistItemsById,
  replacePlaylistNameById,
  replacePlaylistPerDisplayById,
  replacePlaylistSettingsById
} from '../shared/player-config'
import type {
  DisplayConfig,
  DisplayInfo,
  PlayerConfig,
  PlayerStatus,
  PlaylistConfig,
  PlaylistItem
} from '../shared/types'
import { createId } from '../shared/utils'

/**
 * Manages control-view state, persistence, and playlist mutations.
 */
export const useControlView = () => {
  const api = getFutaeApi()
  const config = ref<PlayerConfig>(createDefaultConfig())
  const isConfigReady = ref(false)
  const displayInfos = ref<DisplayInfo[]>([])
  const status = ref<PlayerStatus>({
    running: false,
    displayCount: 0
  })
  const selectedPlaylistId = ref('')
  const selectedPlaylistScope = ref('shared')

  let removeDisplayListener: (() => void) | null = null

  const selectedPlaylist = computed(() =>
    getPlaylistById(
      config.value.playlists,
      selectedPlaylistId.value || config.value.activePlaylistId
    )
  )
  const selectedPlaylistIndex = computed(() =>
    config.value.playlists.findIndex(
      (playlist) => playlist.id === selectedPlaylist.value.id
    )
  )
  const enabledDisplayCount = computed(
    () =>
      displayInfos.value.filter(
        (display) => config.value.displays[display.id]?.enabled !== false
      ).length
  )
  const primaryDisplayId = computed(() =>
    getPrimaryDisplayId(displayInfos.value)
  )

  /** Returns the effective display configuration for a display id. */
  const getDisplayConfig = (displayId: string): DisplayConfig =>
    config.value.displays[displayId] ?? {
      enabled: true,
      playlists: config.value.playlists.map((playlist) =>
        clonePlaylist(playlist)
      )
    }

  /** Clones playlist items so cross-display updates do not share references. */
  const cloneItems = (items: PlaylistItem[]): PlaylistItem[] =>
    items.map((item) => ({ ...item }))

  /** Clones a playlist deeply enough for editor mutations. */
  const clonePlaylist = (playlist: PlaylistConfig): PlaylistConfig => ({
    ...playlist,
    items: cloneItems(playlist.items)
  })

  /** Generates the next unused playlist label. */
  const nextPlaylistName = () => {
    const names = new Set(
      config.value.playlists.map((playlist) => playlist.name)
    )
    let index = 1

    while (names.has(`プレイリスト ${index}`)) {
      index += 1
    }

    return `プレイリスト ${index}`
  }

  /** Generates a non-conflicting duplicate name beside the source playlist. */
  const nextDuplicateName = (name: string) => {
    const names = new Set(
      config.value.playlists.map((playlist) => playlist.name)
    )
    let index = 1
    let candidate = `${name} のコピー`

    while (names.has(candidate)) {
      index += 1
      candidate = `${name} のコピー ${index}`
    }

    return candidate
  }

  /** Keeps current selection valid after config or display changes. */
  const syncSelection = () => {
    const nextSelected = getPlaylistById(
      config.value.playlists,
      selectedPlaylistId.value || config.value.activePlaylistId
    )

    selectedPlaylistId.value = nextSelected.id

    if (
      !nextSelected.perDisplay ||
      (selectedPlaylistScope.value !== 'shared' &&
        !displayInfos.value.some(
          (display) => display.id === selectedPlaylistScope.value
        ))
    ) {
      selectedPlaylistScope.value = 'shared'
    }
  }

  /** Synchronizes connected display changes into the editable config. */
  const syncDisplays = (displays: DisplayInfo[]) => {
    displayInfos.value = displays
    config.value = ensureDisplayConfigs(config.value, displays)
    autoSave.touch()
    syncSelection()
  }

  /** Persists the current config after normalizing display-specific fields. */
  const persistConfig = async (next: PlayerConfig) => {
    const rawConfig = structuredClone(toRaw(next))
    const prepared = ensureDisplayConfigs(
      {
        ...rawConfig,
        updatedAt: new Date().toISOString()
      },
      displayInfos.value
    )

    return api.config.save(prepared)
  }

  const autoSave = createAutoSaveController({
    onError: (error) => {
      console.error('Failed to auto-save config.', error)
    },
    persist: persistConfig,
    source: config
  })

  /** Commits config mutations and optionally keeps selection / autosave in sync. */
  const updateConfigState = (
    next: PlayerConfig,
    options: {
      syncCurrentSelection?: boolean
      touchAutoSave?: boolean
    } = {}
  ) => {
    const { syncCurrentSelection = true, touchAutoSave = true } = options

    config.value = ensureDisplayConfigs(next, displayInfos.value)

    if (touchAutoSave) {
      autoSave.touch()
    }

    if (syncCurrentSelection) {
      syncSelection()
    }
  }

  /** Loads persisted config, current displays, and player state. */
  const loadConfig = async () => {
    autoSave.pause()
    isConfigReady.value = false
    const [nextConfig, nextDisplays, nextStatus] = await Promise.all([
      api.config.get(),
      api.displays.list(),
      api.player.status()
    ])
    displayInfos.value = nextDisplays
    config.value = ensureDisplayConfigs(nextConfig, nextDisplays)
    syncSelection()
    autoSave.resume(config.value)
    status.value = nextStatus
    isConfigReady.value = true
  }

  /** Selects the working playlist and resets the tab scope. */
  const selectPlaylist = (playlistId: string) => {
    selectedPlaylistId.value = playlistId
    selectedPlaylistScope.value = 'shared'
  }

  /** Marks a playlist as the active playback target. */
  const setActivePlaylist = (playlistId: string) => {
    updateConfigState(
      {
        ...config.value,
        activePlaylistId: playlistId
      },
      { syncCurrentSelection: true, touchAutoSave: true }
    )
  }

  /** Toggles whether a display is available for playback. */
  const setDisplayEnabled = (displayId: string, enabled: boolean) => {
    const displayConfig = getDisplayConfig(displayId)

    updateConfigState(
      {
        ...config.value,
        displays: {
          ...config.value.displays,
          [displayId]: {
            ...displayConfig,
            enabled
          }
        }
      },
      { syncCurrentSelection: false, touchAutoSave: true }
    )
  }

  /** Updates the selected playlist scope tab. */
  const updateSelectedPlaylistScope = (
    value: string | number | null | undefined
  ) => {
    selectedPlaylistScope.value = value ? String(value) : 'shared'
  }

  /** Replaces the shared playlist items and syncs non per-display copies. */
  const updateSelectedSharedPlaylist = (playlist: PlaylistItem[]) => {
    const playlistId = selectedPlaylist.value.id
    const nextPlaylists = replacePlaylistItemsById(
      config.value.playlists,
      playlistId,
      playlist
    )

    const nextDisplays = selectedPlaylist.value.perDisplay
      ? primaryDisplayId.value
        ? Object.fromEntries(
            Object.entries(config.value.displays).map(
              ([displayId, displayConfig]) => [
                displayId,
                displayId === primaryDisplayId.value
                  ? {
                      ...displayConfig,
                      playlists: replacePlaylistItemsById(
                        displayConfig.playlists,
                        playlistId,
                        playlist
                      )
                    }
                  : displayConfig
              ]
            )
          )
        : config.value.displays
      : Object.fromEntries(
          Object.entries(config.value.displays).map(
            ([displayId, displayConfig]) => [
              displayId,
              {
                ...displayConfig,
                playlists: replacePlaylistItemsById(
                  displayConfig.playlists,
                  playlistId,
                  playlist
                )
              }
            ]
          )
        )

    updateConfigState(
      {
        ...config.value,
        playlists: nextPlaylists,
        displays: nextDisplays
      },
      { syncCurrentSelection: false, touchAutoSave: true }
    )
  }

  /** Replaces the playlist items for a specific display override. */
  const updateSelectedDisplayPlaylist = (
    displayId: string,
    playlist: PlaylistItem[]
  ) => {
    const displayConfig = getDisplayConfig(displayId)

    updateConfigState(
      {
        ...config.value,
        displays: {
          ...config.value.displays,
          [displayId]: {
            ...displayConfig,
            playlists: replacePlaylistItemsById(
              displayConfig.playlists,
              selectedPlaylist.value.id,
              playlist
            )
          }
        }
      },
      { syncCurrentSelection: false, touchAutoSave: true }
    )
  }

  /** Renames the selected playlist. */
  const renameSelectedPlaylist = (name: string) => {
    updateConfigState(
      {
        ...config.value,
        playlists: replacePlaylistNameById(
          config.value.playlists,
          selectedPlaylist.value.id,
          name
        )
      },
      { syncCurrentSelection: false, touchAutoSave: true }
    )
  }

  /** Toggles whether the selected playlist uses display-specific overrides. */
  const toggleSelectedPlaylistPerDisplay = (enabled: boolean) => {
    const playlistId = selectedPlaylist.value.id
    const nextPerDisplayPlaylists = replacePlaylistPerDisplayById(
      config.value.playlists,
      playlistId,
      enabled
    )
    const nextPlaylists =
      enabled || !primaryDisplayId.value
        ? nextPerDisplayPlaylists
        : replacePlaylistItemsById(
            nextPerDisplayPlaylists,
            playlistId,
            cloneItems(
              getPlaylistById(
                getDisplayConfig(primaryDisplayId.value).playlists,
                playlistId
              ).items
            )
          )
    const nextSharedPlaylist = getPlaylistById(nextPlaylists, playlistId)

    const nextDisplays = Object.fromEntries(
      Object.entries(config.value.displays).map(
        ([displayId, displayConfig]) => [
          displayId,
          {
            ...displayConfig,
            playlists: replacePlaylistById(
              displayConfig.playlists,
              playlistId,
              () => clonePlaylist(nextSharedPlaylist)
            )
          }
        ]
      )
    )

    updateConfigState(
      {
        ...config.value,
        playlists: nextPlaylists,
        displays: nextDisplays
      },
      { syncCurrentSelection: true, touchAutoSave: true }
    )
    selectedPlaylistScope.value = 'shared'
  }

  /** Updates selected playlist settings without replacing its items. */
  const updateSelectedPlaylistSettings = (
    settings: Partial<
      Pick<
        PlaylistConfig,
        'loop' | 'shuffle' | 'defaultDurationSec' | 'webTimeoutSec'
      >
    >
  ) => {
    updateConfigState(
      {
        ...config.value,
        playlists: replacePlaylistSettingsById(
          config.value.playlists,
          selectedPlaylist.value.id,
          settings
        )
      },
      { syncCurrentSelection: false, touchAutoSave: true }
    )
  }

  /** Guards numeric duration updates from empty input states. */
  const updateSelectedPlaylistDefaultDuration = (
    value: number | null | undefined
  ) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return
    }

    updateSelectedPlaylistSettings({
      defaultDurationSec: value
    })
  }

  /** Guards numeric timeout updates from empty input states. */
  const updateSelectedPlaylistWebTimeout = (
    value: number | null | undefined
  ) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return
    }

    updateSelectedPlaylistSettings({
      webTimeoutSec: value
    })
  }

  /** Appends a new playlist and selects it immediately. */
  const addPlaylist = () => {
    const playlist = createDefaultPlaylistConfig(nextPlaylistName())
    const nextPlaylists = [...config.value.playlists, playlist]

    updateConfigState(
      {
        ...config.value,
        playlists: nextPlaylists
      },
      { syncCurrentSelection: false, touchAutoSave: true }
    )
    selectedPlaylistId.value = playlist.id
    selectedPlaylistScope.value = 'shared'
  }

  /** Duplicates the selected playlist including per-display overrides. */
  const duplicateSelectedPlaylist = () => {
    const source = selectedPlaylist.value
    const duplicateId = createId()
    const duplicatePlaylist: PlaylistConfig = {
      ...clonePlaylist(source),
      id: duplicateId,
      name: nextDuplicateName(source.name)
    }
    const insertIndex = selectedPlaylistIndex.value + 1
    const nextPlaylists = [...config.value.playlists]
    nextPlaylists.splice(insertIndex, 0, duplicatePlaylist)

    const nextDisplays = Object.fromEntries(
      Object.entries(config.value.displays).map(
        ([displayId, displayConfig]) => {
          const sourceDisplayPlaylist = getPlaylistById(
            displayConfig.playlists,
            source.id
          )
          const duplicateDisplayPlaylist = source.perDisplay
            ? {
                ...clonePlaylist(sourceDisplayPlaylist),
                id: duplicateId,
                name: duplicatePlaylist.name,
                perDisplay: duplicatePlaylist.perDisplay
              }
            : clonePlaylist(duplicatePlaylist)
          const nextDisplayPlaylists = [...displayConfig.playlists]
          nextDisplayPlaylists.splice(insertIndex, 0, duplicateDisplayPlaylist)

          return [
            displayId,
            {
              ...displayConfig,
              playlists: nextDisplayPlaylists
            }
          ]
        }
      )
    )

    updateConfigState(
      {
        ...config.value,
        playlists: nextPlaylists,
        displays: nextDisplays
      },
      { syncCurrentSelection: false, touchAutoSave: true }
    )
    selectedPlaylistId.value = duplicateId
    selectedPlaylistScope.value = 'shared'
  }

  /** Removes the selected playlist while keeping one fallback playlist active. */
  const removeSelectedPlaylist = () => {
    if (config.value.playlists.length <= 1) {
      return
    }

    const removeIndex = selectedPlaylistIndex.value
    const removeId = selectedPlaylist.value.id
    const nextPlaylists = config.value.playlists.filter(
      (playlist) => playlist.id !== removeId
    )
    const fallbackPlaylist =
      nextPlaylists[removeIndex] ?? nextPlaylists[removeIndex - 1]

    updateConfigState(
      {
        ...config.value,
        activePlaylistId:
          config.value.activePlaylistId === removeId
            ? fallbackPlaylist.id
            : config.value.activePlaylistId,
        playlists: nextPlaylists,
        displays: Object.fromEntries(
          Object.entries(config.value.displays).map(
            ([displayId, displayConfig]) => [
              displayId,
              {
                ...displayConfig,
                playlists: displayConfig.playlists.filter(
                  (playlist) => playlist.id !== removeId
                )
              }
            ]
          )
        )
      },
      { syncCurrentSelection: false, touchAutoSave: true }
    )
    selectedPlaylistId.value = fallbackPlaylist.id
    selectedPlaylistScope.value = 'shared'
  }

  /** Moves the selected playlist within the shared catalog order. */
  const moveSelectedPlaylist = (offset: -1 | 1) => {
    const from = selectedPlaylistIndex.value
    const to = from + offset

    if (from < 0 || to < 0 || to >= config.value.playlists.length) {
      return
    }

    const nextPlaylists = [...config.value.playlists]
    const [moved] = nextPlaylists.splice(from, 1)
    nextPlaylists.splice(to, 0, moved)

    updateConfigState(
      {
        ...config.value,
        playlists: nextPlaylists
      },
      { syncCurrentSelection: false, touchAutoSave: true }
    )
    selectedPlaylistId.value = moved.id
  }

  /** Flushes pending autosave work and starts playback. */
  const startPlayer = async () => {
    await autoSave.flush()
    status.value = await api.player.start()
  }

  onMounted(async () => {
    await loadConfig()
    removeDisplayListener = api.displays.onChanged((displays) => {
      syncDisplays(displays)
    })
  })

  onBeforeUnmount(() => {
    removeDisplayListener?.()
    void autoSave
      .flush()
      .catch((error) => {
        console.error('Failed to flush config before closing.', error)
      })
      .finally(() => {
        autoSave.stop()
      })
  })

  return {
    addPlaylist,
    config,
    enabledDisplayCount,
    displayInfos,
    duplicateSelectedPlaylist,
    isConfigReady,
    moveSelectedPlaylist,
    removeSelectedPlaylist,
    renameSelectedPlaylist,
    selectPlaylist,
    selectedPlaylist,
    selectedPlaylistIndex,
    selectedPlaylistScope,
    setActivePlaylist,
    setDisplayEnabled,
    startPlayer,
    toggleSelectedPlaylistPerDisplay,
    updateSelectedDisplayPlaylist,
    updateSelectedPlaylistDefaultDuration,
    updateSelectedPlaylistScope,
    updateSelectedPlaylistSettings,
    updateSelectedPlaylistWebTimeout,
    updateSelectedSharedPlaylist
  }
}

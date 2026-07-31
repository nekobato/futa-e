import { clonePlaylists, createDefaultPlaylistConfig } from './defaults'
import type {
  DisplayConfig,
  DisplayInfo,
  PlayerConfig,
  PlaylistConfig,
  PlaylistItem
} from './types'

export const ensurePlaylists = (
  playlists: PlaylistConfig[] | undefined
): PlaylistConfig[] =>
  playlists && playlists.length > 0
    ? clonePlaylists(playlists)
    : [createDefaultPlaylistConfig()]

const clonePlaylist = (playlist: PlaylistConfig): PlaylistConfig =>
  clonePlaylists([playlist])[0] ?? createDefaultPlaylistConfig()

export const syncPlaylistsWithSource = (
  sourcePlaylists: PlaylistConfig[] | undefined,
  currentPlaylists: PlaylistConfig[] | undefined
): PlaylistConfig[] => {
  const source = ensurePlaylists(sourcePlaylists)
  const current = currentPlaylists ? clonePlaylists(currentPlaylists) : []
  const currentById = new Map(
    current.map((playlist) => [playlist.id, playlist])
  )

  return source.map((sourcePlaylist) => {
    const currentPlaylist = currentById.get(sourcePlaylist.id)

    if (!currentPlaylist) {
      return clonePlaylist(sourcePlaylist)
    }

    return {
      ...currentPlaylist,
      name: sourcePlaylist.name,
      perDisplay: sourcePlaylist.perDisplay,
      loop: sourcePlaylist.loop,
      shuffle: sourcePlaylist.shuffle,
      defaultDurationSec: sourcePlaylist.defaultDurationSec,
      webTimeoutSec: sourcePlaylist.webTimeoutSec
    }
  })
}

/**
 * Synchronizes per-playlist display inclusion with the shared playlist catalog.
 */
export const syncPlaylistEnabledWithSource = (
  sourcePlaylists: PlaylistConfig[] | undefined,
  current: Record<string, boolean> | undefined
): Record<string, boolean> =>
  Object.fromEntries(
    ensurePlaylists(sourcePlaylists).map((playlist) => [
      playlist.id,
      current?.[playlist.id] !== false
    ])
  )

export const createDisplayConfig = (
  config: PlayerConfig,
  enabled = true
): DisplayConfig => ({
  enabled,
  playlistEnabled: syncPlaylistEnabledWithSource(config.playlists, undefined),
  playlists: ensurePlaylists(config.playlists)
})

export const ensureDisplayConfigs = (
  config: PlayerConfig,
  displays: DisplayInfo[],
  {
    newDisplayEnabled = true
  }: {
    newDisplayEnabled?: boolean
  } = {}
): PlayerConfig => {
  const nextDisplays = { ...config.displays }

  displays.forEach((display) => {
    const current = nextDisplays[display.id]
    nextDisplays[display.id] = current
      ? {
          enabled: current.enabled,
          playlistEnabled: syncPlaylistEnabledWithSource(
            config.playlists,
            current.playlistEnabled
          ),
          playlists: syncPlaylistsWithSource(
            config.playlists,
            current.playlists
          )
        }
      : createDisplayConfig(config, newDisplayEnabled)
  })

  return {
    ...config,
    activePlaylistId: getPlaylistById(config.playlists, config.activePlaylistId)
      .id,
    displays: nextDisplays
  }
}

/**
 * Returns the primary display, falling back to the first known display when needed.
 */
export const getPrimaryDisplay = (
  displays: DisplayInfo[]
): DisplayInfo | null =>
  displays.find((display) => display.isPrimary) ?? displays[0] ?? null

/**
 * Returns the identifier of the primary display when one can be resolved.
 */
export const getPrimaryDisplayId = (displays: DisplayInfo[]): string | null =>
  getPrimaryDisplay(displays)?.id ?? null

export const getPlaylistById = (
  playlists: PlaylistConfig[] | undefined,
  playlistId: string | null | undefined
): PlaylistConfig => {
  const nextPlaylists = ensurePlaylists(playlists)

  return (
    nextPlaylists.find((playlist) => playlist.id === playlistId) ??
    nextPlaylists[0]
  )
}

export const getActivePlaylist = (
  config: Pick<PlayerConfig, 'activePlaylistId' | 'playlists'>,
  playlists: PlaylistConfig[] | undefined = config.playlists
): PlaylistConfig => getPlaylistById(playlists, config.activePlaylistId)

export const isPerDisplayPlaylist = (playlist: PlaylistConfig): boolean =>
  playlist.perDisplay

export const getEffectiveDisplayConfig = (
  config: PlayerConfig,
  displayId: string | null
): DisplayConfig => {
  const current = displayId ? config.displays[displayId] : undefined

  if (!current) {
    return createDisplayConfig(config)
  }

  return {
    enabled: current.enabled,
    playlistEnabled: syncPlaylistEnabledWithSource(
      config.playlists,
      current.playlistEnabled
    ),
    playlists: isPerDisplayPlaylist(getActivePlaylist(config))
      ? syncPlaylistsWithSource(config.playlists, current.playlists)
      : ensurePlaylists(config.playlists)
  }
}

/**
 * Returns whether a display is included by both global and active-playlist
 * playback settings.
 */
export const isDisplayPlaybackTarget = (
  config: PlayerConfig,
  displayId: string
): boolean => {
  const displayConfig = config.displays[displayId]

  if (displayConfig?.enabled === false) {
    return false
  }

  const activePlaylist = getActivePlaylist(config)

  if (!activePlaylist.perDisplay) {
    return true
  }

  return displayConfig?.playlistEnabled?.[activePlaylist.id] !== false
}

export const replacePlaylistById = (
  playlists: PlaylistConfig[] | undefined,
  playlistId: string,
  updater: (playlist: PlaylistConfig) => PlaylistConfig
): PlaylistConfig[] =>
  ensurePlaylists(playlists).map((playlist) =>
    playlist.id === playlistId ? updater(clonePlaylist(playlist)) : playlist
  )

export const replacePlaylistItemsById = (
  playlists: PlaylistConfig[] | undefined,
  playlistId: string,
  items: PlaylistItem[]
): PlaylistConfig[] =>
  replacePlaylistById(playlists, playlistId, (playlist) => ({
    ...playlist,
    items: items.map((item) => ({ ...item }))
  }))

export const replacePlaylistPerDisplayById = (
  playlists: PlaylistConfig[] | undefined,
  playlistId: string,
  perDisplay: boolean
): PlaylistConfig[] =>
  replacePlaylistById(playlists, playlistId, (playlist) => ({
    ...playlist,
    perDisplay
  }))

export const replacePlaylistNameById = (
  playlists: PlaylistConfig[] | undefined,
  playlistId: string,
  name: string
): PlaylistConfig[] =>
  replacePlaylistById(playlists, playlistId, (playlist) => ({
    ...playlist,
    name
  }))

export const replacePlaylistSettingsById = (
  playlists: PlaylistConfig[] | undefined,
  playlistId: string,
  settings: Partial<
    Pick<
      PlaylistConfig,
      'loop' | 'shuffle' | 'defaultDurationSec' | 'webTimeoutSec'
    >
  >
): PlaylistConfig[] =>
  replacePlaylistById(playlists, playlistId, (playlist) => ({
    ...playlist,
    ...settings
  }))

/**
 * Filters displays down to targets enabled globally and by the active playlist.
 */
export const filterPlaybackDisplays = <T extends { id: string | number }>(
  config: PlayerConfig,
  displays: T[]
): T[] =>
  displays.filter((display) =>
    isDisplayPlaybackTarget(config, String(display.id))
  )

export const countPlaybackDisplays = (
  config: PlayerConfig,
  displays: DisplayInfo[]
): number => filterPlaybackDisplays(config, displays).length

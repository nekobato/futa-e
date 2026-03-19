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
      perDisplay: sourcePlaylist.perDisplay
    }
  })
}

export const createDisplayConfig = (config: PlayerConfig): DisplayConfig => ({
  enabled: true,
  playlists: ensurePlaylists(config.playlists)
})

export const ensureDisplayConfigs = (
  config: PlayerConfig,
  displays: DisplayInfo[]
): PlayerConfig => {
  const nextDisplays = { ...config.displays }

  displays.forEach((display) => {
    const current = nextDisplays[display.id]
    nextDisplays[display.id] = current
      ? {
          enabled: current.enabled,
          playlists: syncPlaylistsWithSource(
            config.playlists,
            current.playlists
          )
        }
      : createDisplayConfig(config)
  })

  return {
    ...config,
    activePlaylistId: getPlaylistById(config.playlists, config.activePlaylistId)
      .id,
    displays: nextDisplays
  }
}

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
  if (!displayId || !isPerDisplayPlaylist(getActivePlaylist(config))) {
    return createDisplayConfig(config)
  }

  const current = config.displays[displayId]

  if (!current) {
    return createDisplayConfig(config)
  }

  return {
    enabled: current.enabled,
    playlists: syncPlaylistsWithSource(config.playlists, current.playlists)
  }
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

export const countEnabledDisplays = (
  config: PlayerConfig,
  displays: DisplayInfo[]
): number => {
  if (!isPerDisplayPlaylist(getActivePlaylist(config))) {
    return displays.length
  }

  return displays.filter(
    (display) => config.displays[display.id]?.enabled !== false
  ).length
}

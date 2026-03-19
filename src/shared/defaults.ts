import type {
  AssetType,
  DisplayConfig,
  PlayerConfig,
  PlaylistConfig,
  PlaylistItem
} from './types'
import { clampNumber, createId, isRecord, titleFromPath } from './utils'

const DEFAULT_PLAYLIST_NAME = 'プレイリスト 1'
const LEGACY_OVERLAY_PLAYLIST_NAME = 'プレイリスト 2'

export const createDefaultPlaylistConfig = (
  name = DEFAULT_PLAYLIST_NAME
): PlaylistConfig => ({
  id: createId(),
  name,
  perDisplay: false,
  items: []
})

export const createDefaultPlaylists = (): PlaylistConfig[] => [
  createDefaultPlaylistConfig()
]

export const createDefaultConfig = (): PlayerConfig => {
  const playlists = createDefaultPlaylists()

  return {
    version: 1,
    activePlaylistId: playlists[0]?.id ?? createId(),
    playlists,
    loop: true,
    shuffle: false,
    defaultDurationSec: 10,
    webTimeoutSec: 8,
    displays: {},
    updatedAt: new Date().toISOString()
  }
}

const isAssetType = (value: unknown): value is AssetType =>
  value === 'image' || value === 'video' || value === 'web'

const clonePlaylistItems = (playlist: PlaylistItem[]): PlaylistItem[] =>
  playlist.map((item) => ({ ...item }))

export const clonePlaylists = (playlists: PlaylistConfig[]): PlaylistConfig[] =>
  playlists.map((playlist) => ({
    ...playlist,
    items: clonePlaylistItems(playlist.items)
  }))

const normalizeItem = (item: unknown): PlaylistItem | null => {
  if (!isRecord(item)) {
    return null
  }

  const type = isAssetType(item.type) ? item.type : null
  const src = typeof item.src === 'string' ? item.src : ''

  if (!type || !src) {
    return null
  }

  const title = typeof item.title === 'string' ? item.title : titleFromPath(src)
  const durationRaw =
    typeof item.durationSec === 'number' ? item.durationSec : undefined
  const durationSec = durationRaw
    ? clampNumber(durationRaw, 1, 36000)
    : undefined

  return {
    id: typeof item.id === 'string' ? item.id : createId(),
    type,
    title,
    src,
    originUrl: typeof item.originUrl === 'string' ? item.originUrl : undefined,
    durationSec,
    fallbackSrc:
      typeof item.fallbackSrc === 'string' ? item.fallbackSrc : undefined,
    mute: typeof item.mute === 'boolean' ? item.mute : false
  }
}

const normalizePlaylistItems = (value: unknown): PlaylistItem[] =>
  Array.isArray(value)
    ? value
        .map((item) => normalizeItem(item))
        .filter((item): item is PlaylistItem => Boolean(item))
    : []

const normalizeLegacyOverlayItems = (value: unknown): PlaylistItem[] => {
  if (Array.isArray(value)) {
    return normalizePlaylistItems(value)
  }

  if (!isRecord(value)) {
    return []
  }

  if (typeof value.imageSrc === 'string' && value.imageSrc.trim().length > 0) {
    return [
      {
        id: createId(),
        type: 'image',
        title: titleFromPath(value.imageSrc),
        src: value.imageSrc,
        durationSec: undefined,
        mute: false
      }
    ]
  }

  return []
}

const normalizePlaylistConfig = (
  value: unknown,
  fallbackName: string,
  fallbackPerDisplay = false
): PlaylistConfig | null => {
  if (!isRecord(value)) {
    return null
  }

  const items = normalizePlaylistItems(value.items)

  return {
    id: typeof value.id === 'string' ? value.id : createId(),
    name:
      typeof value.name === 'string' && value.name.trim().length > 0
        ? value.name
        : fallbackName,
    perDisplay:
      typeof value.perDisplay === 'boolean'
        ? value.perDisplay
        : fallbackPerDisplay,
    items
  }
}

const normalizePlaylists = (
  value: unknown,
  fallback: PlaylistConfig[]
): PlaylistConfig[] => {
  if (!Array.isArray(value)) {
    return clonePlaylists(fallback)
  }

  const playlists = value
    .map((playlist, index) =>
      normalizePlaylistConfig(
        playlist,
        `プレイリスト ${index + 1}`,
        fallback[index]?.perDisplay ?? false
      )
    )
    .filter((playlist): playlist is PlaylistConfig => Boolean(playlist))

  return playlists.length > 0 ? playlists : clonePlaylists(fallback)
}

const normalizeLegacyPlaylists = (
  playlistValue: unknown,
  overlayValue: unknown,
  fallback: PlaylistConfig[],
  legacyPerDisplay: boolean
): PlaylistConfig[] => {
  const primaryItems = normalizePlaylistItems(playlistValue)
  const overlayItems = normalizeLegacyOverlayItems(overlayValue)

  const nextPlaylists: PlaylistConfig[] = [
    {
      id: createId(),
      name: DEFAULT_PLAYLIST_NAME,
      perDisplay: legacyPerDisplay,
      items:
        primaryItems.length > 0
          ? primaryItems
          : clonePlaylistItems(fallback[0]?.items ?? [])
    }
  ]

  if (overlayItems.length > 0) {
    nextPlaylists.push({
      id: createId(),
      name: LEGACY_OVERLAY_PLAYLIST_NAME,
      perDisplay: legacyPerDisplay,
      items: overlayItems
    })
  }

  return nextPlaylists
}

const normalizeDisplayConfig = (
  value: unknown,
  fallbackPlaylists: PlaylistConfig[]
): DisplayConfig | null => {
  if (!isRecord(value)) {
    return null
  }

  const playlists = Array.isArray(value.playlists)
    ? normalizePlaylists(value.playlists, fallbackPlaylists)
    : normalizeLegacyPlaylists(
        value.playlist,
        value.overlay,
        fallbackPlaylists,
        fallbackPlaylists[0]?.perDisplay ?? false
      )

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    playlists
  }
}

export const coerceConfig = (raw: unknown): PlayerConfig => {
  const base = createDefaultConfig()

  if (!isRecord(raw)) {
    return base
  }

  const legacyPerDisplay = raw.displayMode === 'per-display'
  const playlists = Array.isArray(raw.playlists)
    ? normalizePlaylists(raw.playlists, base.playlists)
    : normalizeLegacyPlaylists(
        raw.playlist,
        raw.overlay,
        base.playlists,
        legacyPerDisplay
      )

  const loop = typeof raw.loop === 'boolean' ? raw.loop : base.loop
  const shuffle = typeof raw.shuffle === 'boolean' ? raw.shuffle : base.shuffle
  const activePlaylistId =
    typeof raw.activePlaylistId === 'string' &&
    playlists.some((playlist) => playlist.id === raw.activePlaylistId)
      ? raw.activePlaylistId
      : (playlists[0]?.id ?? base.activePlaylistId)
  const defaultDurationSec =
    typeof raw.defaultDurationSec === 'number'
      ? clampNumber(raw.defaultDurationSec, 2, 36000)
      : base.defaultDurationSec
  const webTimeoutSec =
    typeof raw.webTimeoutSec === 'number'
      ? clampNumber(raw.webTimeoutSec, 2, 120)
      : base.webTimeoutSec
  const displays = isRecord(raw.displays)
    ? Object.entries(raw.displays).reduce<Record<string, DisplayConfig>>(
        (accumulator, [displayId, value]) => {
          const normalized = normalizeDisplayConfig(value, playlists)
          if (normalized) {
            accumulator[displayId] = normalized
          }
          return accumulator
        },
        {}
      )
    : base.displays

  return {
    version: 1,
    activePlaylistId,
    playlists,
    loop,
    shuffle,
    defaultDurationSec,
    webTimeoutSec,
    displays,
    updatedAt:
      typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt
  }
}

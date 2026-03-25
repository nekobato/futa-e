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
const DEFAULT_PLAYLIST_LOOP = true
const DEFAULT_PLAYLIST_SHUFFLE = false
const DEFAULT_PLAYLIST_DURATION_SEC = 10
const DEFAULT_PLAYLIST_WEB_TIMEOUT_SEC = 8

type PlaylistPlaybackDefaults = Pick<
  PlaylistConfig,
  'loop' | 'shuffle' | 'defaultDurationSec' | 'webTimeoutSec'
>

const createPlaylistPlaybackDefaults = (
  overrides: Partial<PlaylistPlaybackDefaults> = {}
): PlaylistPlaybackDefaults => ({
  loop: DEFAULT_PLAYLIST_LOOP,
  shuffle: DEFAULT_PLAYLIST_SHUFFLE,
  defaultDurationSec: DEFAULT_PLAYLIST_DURATION_SEC,
  webTimeoutSec: DEFAULT_PLAYLIST_WEB_TIMEOUT_SEC,
  ...overrides
})

export const createDefaultPlaylistConfig = (
  name = DEFAULT_PLAYLIST_NAME,
  playbackDefaults: Partial<PlaylistPlaybackDefaults> = {}
): PlaylistConfig => ({
  id: createId(),
  name,
  perDisplay: false,
  ...createPlaylistPlaybackDefaults(playbackDefaults),
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
  fallbackPerDisplay = false,
  playbackDefaults: PlaylistPlaybackDefaults = createPlaylistPlaybackDefaults()
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
    loop: typeof value.loop === 'boolean' ? value.loop : playbackDefaults.loop,
    shuffle:
      typeof value.shuffle === 'boolean'
        ? value.shuffle
        : playbackDefaults.shuffle,
    defaultDurationSec:
      typeof value.defaultDurationSec === 'number'
        ? clampNumber(value.defaultDurationSec, 2, 36000)
        : playbackDefaults.defaultDurationSec,
    webTimeoutSec:
      typeof value.webTimeoutSec === 'number'
        ? clampNumber(value.webTimeoutSec, 2, 120)
        : playbackDefaults.webTimeoutSec,
    items
  }
}

const normalizePlaylists = (
  value: unknown,
  fallback: PlaylistConfig[],
  legacyPlaybackDefaults = createPlaylistPlaybackDefaults()
): PlaylistConfig[] => {
  if (!Array.isArray(value)) {
    return clonePlaylists(fallback)
  }

  const playlists = value
    .map((playlist, index) =>
      normalizePlaylistConfig(
        playlist,
        `プレイリスト ${index + 1}`,
        fallback[index]?.perDisplay ?? false,
        {
          loop: fallback[index]?.loop ?? legacyPlaybackDefaults.loop,
          shuffle: fallback[index]?.shuffle ?? legacyPlaybackDefaults.shuffle,
          defaultDurationSec:
            fallback[index]?.defaultDurationSec ??
            legacyPlaybackDefaults.defaultDurationSec,
          webTimeoutSec:
            fallback[index]?.webTimeoutSec ??
            legacyPlaybackDefaults.webTimeoutSec
        }
      )
    )
    .filter((playlist): playlist is PlaylistConfig => Boolean(playlist))

  return playlists.length > 0 ? playlists : clonePlaylists(fallback)
}

const normalizeLegacyPlaylists = (
  playlistValue: unknown,
  overlayValue: unknown,
  fallback: PlaylistConfig[],
  legacyPerDisplay: boolean,
  playbackDefaults: PlaylistPlaybackDefaults
): PlaylistConfig[] => {
  const primaryItems = normalizePlaylistItems(playlistValue)
  const overlayItems = normalizeLegacyOverlayItems(overlayValue)

  const nextPlaylists: PlaylistConfig[] = [
    {
      id: createId(),
      name: DEFAULT_PLAYLIST_NAME,
      perDisplay: legacyPerDisplay,
      ...playbackDefaults,
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
      ...playbackDefaults,
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
        fallbackPlaylists[0]?.perDisplay ?? false,
        createPlaylistPlaybackDefaults({
          loop: fallbackPlaylists[0]?.loop,
          shuffle: fallbackPlaylists[0]?.shuffle,
          defaultDurationSec: fallbackPlaylists[0]?.defaultDurationSec,
          webTimeoutSec: fallbackPlaylists[0]?.webTimeoutSec
        })
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

  const legacyPlaybackDefaults = createPlaylistPlaybackDefaults({
    loop: typeof raw.loop === 'boolean' ? raw.loop : undefined,
    shuffle: typeof raw.shuffle === 'boolean' ? raw.shuffle : undefined,
    defaultDurationSec:
      typeof raw.defaultDurationSec === 'number'
        ? clampNumber(raw.defaultDurationSec, 2, 36000)
        : undefined,
    webTimeoutSec:
      typeof raw.webTimeoutSec === 'number'
        ? clampNumber(raw.webTimeoutSec, 2, 120)
        : undefined
  })

  const legacyPerDisplay = raw.displayMode === 'per-display'
  const playlists = Array.isArray(raw.playlists)
    ? normalizePlaylists(raw.playlists, base.playlists, legacyPlaybackDefaults)
    : normalizeLegacyPlaylists(
        raw.playlist,
        raw.overlay,
        base.playlists,
        legacyPerDisplay,
        legacyPlaybackDefaults
      )

  const activePlaylistId =
    typeof raw.activePlaylistId === 'string' &&
    playlists.some((playlist) => playlist.id === raw.activePlaylistId)
      ? raw.activePlaylistId
      : (playlists[0]?.id ?? base.activePlaylistId)
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
    displays,
    updatedAt:
      typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt
  }
}

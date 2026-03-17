import type {
  AssetType,
  DisplayConfig,
  OverlayConfig,
  PlayerConfig,
  PlaylistItem
} from './types'
import { clampNumber, createId, isRecord, titleFromPath } from './utils'

export const createDefaultOverlayConfig = (): OverlayConfig => ({
  title: 'Overlay',
  message: 'Display is covered.'
})

export const createDefaultConfig = (): PlayerConfig => ({
  version: 1,
  playlist: [],
  loop: true,
  shuffle: false,
  defaultDurationSec: 10,
  webTimeoutSec: 8,
  overlay: createDefaultOverlayConfig(),
  displayMode: 'mirror',
  displays: {},
  updatedAt: new Date().toISOString()
})

const isAssetType = (value: unknown): value is AssetType =>
  value === 'image' || value === 'video' || value === 'web'

const clonePlaylist = (playlist: PlaylistItem[]): PlaylistItem[] =>
  playlist.map((item) => ({ ...item }))

const cloneOverlay = (overlay: OverlayConfig): OverlayConfig => ({
  title: overlay.title,
  message: overlay.message,
  imageSrc: overlay.imageSrc
})

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

const normalizeOverlayConfig = (
  value: unknown,
  fallback: OverlayConfig
): OverlayConfig => {
  if (!isRecord(value)) {
    return cloneOverlay(fallback)
  }

  return {
    title:
      typeof value.title === 'string' && value.title.trim().length > 0
        ? value.title
        : fallback.title,
    message:
      typeof value.message === 'string' && value.message.trim().length > 0
        ? value.message
        : fallback.message,
    imageSrc:
      typeof value.imageSrc === 'string' ? value.imageSrc : fallback.imageSrc
  }
}

const normalizeDisplayConfig = (
  value: unknown,
  fallbackPlaylist: PlaylistItem[],
  fallbackOverlay: OverlayConfig
): DisplayConfig | null => {
  if (!isRecord(value)) {
    return null
  }

  const playlist = Array.isArray(value.playlist)
    ? value.playlist
        .map((item) => normalizeItem(item))
        .filter((item): item is PlaylistItem => Boolean(item))
    : clonePlaylist(fallbackPlaylist)

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    playlist,
    overlay: normalizeOverlayConfig(value.overlay, fallbackOverlay)
  }
}

export const coerceConfig = (raw: unknown): PlayerConfig => {
  const base = createDefaultConfig()

  if (!isRecord(raw)) {
    return base
  }

  const playlist = Array.isArray(raw.playlist)
    ? raw.playlist
        .map((item) => normalizeItem(item))
        .filter((item): item is PlaylistItem => Boolean(item))
    : base.playlist

  const loop = typeof raw.loop === 'boolean' ? raw.loop : base.loop
  const shuffle = typeof raw.shuffle === 'boolean' ? raw.shuffle : base.shuffle
  const defaultDurationSec =
    typeof raw.defaultDurationSec === 'number'
      ? clampNumber(raw.defaultDurationSec, 2, 36000)
      : base.defaultDurationSec
  const webTimeoutSec =
    typeof raw.webTimeoutSec === 'number'
      ? clampNumber(raw.webTimeoutSec, 2, 120)
      : base.webTimeoutSec
  const overlay = normalizeOverlayConfig(raw.overlay, base.overlay)
  const displayMode =
    raw.displayMode === 'mirror' || raw.displayMode === 'per-display'
      ? raw.displayMode
      : base.displayMode
  const displays = isRecord(raw.displays)
    ? Object.entries(raw.displays).reduce<Record<string, DisplayConfig>>(
        (accumulator, [displayId, value]) => {
          const normalized = normalizeDisplayConfig(value, playlist, overlay)
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
    playlist,
    loop,
    shuffle,
    defaultDurationSec,
    webTimeoutSec,
    overlay,
    displayMode,
    displays,
    updatedAt:
      typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt
  }
}

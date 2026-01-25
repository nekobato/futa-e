import type { PlayerConfig, PlaylistItem, AssetType } from './types'
import { clampNumber, createId, isRecord, titleFromPath } from './utils'

export const createDefaultConfig = (): PlayerConfig => ({
  version: 1,
  mode: 'signage',
  playlist: [],
  loop: true,
  shuffle: false,
  defaultDurationSec: 10,
  webTimeoutSec: 8,
  updatedAt: new Date().toISOString()
})

const isAssetType = (value: unknown): value is AssetType =>
  value === 'image' || value === 'video' || value === 'web'

const normalizeItem = (item: unknown, defaultDuration: number): PlaylistItem | null => {
  if (!isRecord(item)) {
    return null
  }

  const type = isAssetType(item.type) ? item.type : null
  const src = typeof item.src === 'string' ? item.src : ''

  if (!type || !src) {
    return null
  }

  const title = typeof item.title === 'string' ? item.title : titleFromPath(src)
  const durationRaw = typeof item.durationSec === 'number' ? item.durationSec : undefined
  const durationSec = durationRaw ? clampNumber(durationRaw, 1, 36000) : undefined

  return {
    id: typeof item.id === 'string' ? item.id : createId(),
    type,
    title,
    src,
    originUrl: typeof item.originUrl === 'string' ? item.originUrl : undefined,
    durationSec,
    fallbackSrc: typeof item.fallbackSrc === 'string' ? item.fallbackSrc : undefined,
    mute: typeof item.mute === 'boolean' ? item.mute : false
  }
}

export const coerceConfig = (raw: unknown): PlayerConfig => {
  const base = createDefaultConfig()

  if (!isRecord(raw)) {
    return base
  }

  const playlist = Array.isArray(raw.playlist)
    ? raw.playlist
        .map((item) => normalizeItem(item, base.defaultDurationSec))
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

  return {
    version: 1,
    mode: raw.mode === 'signage' || raw.mode === 'decor' || raw.mode === 'privacy' ? raw.mode : base.mode,
    playlist,
    loop,
    shuffle,
    defaultDurationSec,
    webTimeoutSec,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : base.updatedAt
  }
}

import { isAbsolute } from 'node:path'
import type { LocalAssetRegistry } from './local-asset-registry'
import type {
  PlayerConfig,
  PlaylistConfig,
  PlaylistItem
} from '../src/shared/types'
import type { LocalAssetType } from '../src/shared/local-assets'
import {
  isBundledMediaSource,
  isLocalAssetType,
  isOpaqueAssetId
} from '../src/shared/local-assets'
import { isDirectMediaUrl, isLikelyLocalFilePath } from '../src/shared/utils'

/** Detects legacy absolute paths that require one-time registry migration. */
const isLegacyLocalPath = (source: string): boolean =>
  !isBundledMediaSource(source) &&
  (isAbsolute(source) || isLikelyLocalFilePath(source))

/** Migrates one playlist item from absolute paths to opaque asset IDs. */
const migratePlaylistItem = async (
  item: PlaylistItem,
  registry: LocalAssetRegistry
): Promise<PlaylistItem> => {
  let nextItem = { ...item }

  if (isLocalAssetType(item.type)) {
    if (isLegacyLocalPath(item.src)) {
      const asset = await registry.registerLegacy(item.src, item.type)
      nextItem = {
        ...nextItem,
        src: asset.id,
        sourceName: asset.name
      }
    } else if (!isDirectMediaUrl(item.src)) {
      const record = registry.get(item.src)
      nextItem = {
        ...nextItem,
        sourceName: record?.name ?? item.sourceName
      }
    }
  }

  if (item.fallbackSrc) {
    if (isLegacyLocalPath(item.fallbackSrc)) {
      const fallback = await registry.registerLegacy(item.fallbackSrc, 'image')
      nextItem = {
        ...nextItem,
        fallbackSrc: fallback.id,
        fallbackName: fallback.name
      }
    } else if (
      !isDirectMediaUrl(item.fallbackSrc) &&
      !isBundledMediaSource(item.fallbackSrc)
    ) {
      const record = registry.get(item.fallbackSrc)
      nextItem = {
        ...nextItem,
        fallbackName: record?.name ?? item.fallbackName
      }
    }
  }

  return nextItem
}

/** Migrates every item in a playlist while preserving playback settings. */
const migratePlaylist = async (
  playlist: PlaylistConfig,
  registry: LocalAssetRegistry
): Promise<PlaylistConfig> => ({
  ...playlist,
  items: await Promise.all(
    playlist.items.map((item) => migratePlaylistItem(item, registry))
  )
})

/**
 * Converts saved absolute paths to main-process registry references.
 */
export const migrateConfigLocalAssets = async (
  config: PlayerConfig,
  registry: LocalAssetRegistry
): Promise<PlayerConfig> => ({
  ...config,
  playlists: await Promise.all(
    config.playlists.map((playlist) => migratePlaylist(playlist, registry))
  ),
  displays: Object.fromEntries(
    await Promise.all(
      Object.entries(config.displays).map(
        async ([displayId, displayConfig]) => [
          displayId,
          {
            ...displayConfig,
            playlists: await Promise.all(
              displayConfig.playlists.map((playlist) =>
                migratePlaylist(playlist, registry)
              )
            )
          }
        ]
      )
    )
  )
})

/** Validates one local reference without treating renderer input as a path. */
const assertRegisteredReference = (
  source: string,
  type: LocalAssetType,
  registry: LocalAssetRegistry
): void => {
  if (
    isDirectMediaUrl(source) ||
    isBundledMediaSource(source) ||
    (isOpaqueAssetId(source) &&
      (!registry.get(source) || registry.has(source, type)))
  ) {
    return
  }

  throw new TypeError('Config contains an unauthorized local asset reference.')
}

/**
 * Rejects absolute paths and type-confused registry IDs from renderer config.
 */
export const assertConfigLocalAssetsAuthorized = (
  config: PlayerConfig,
  registry: LocalAssetRegistry
): void => {
  const validateItem = (item: PlaylistItem): void => {
    if (isLocalAssetType(item.type)) {
      assertRegisteredReference(item.src, item.type, registry)
    }

    if (item.fallbackSrc) {
      assertRegisteredReference(item.fallbackSrc, 'image', registry)
    }
  }

  config.playlists.forEach((playlist) => playlist.items.forEach(validateItem))
  Object.values(config.displays).forEach((display) => {
    display.playlists.forEach((playlist) =>
      playlist.items.forEach(validateItem)
    )
  })
}

/**
 * Builds the per-request type allowlist from the active playback document.
 */
export const collectAllowedLocalAssets = (
  config: PlayerConfig
): ReadonlyMap<string, LocalAssetType> => {
  const allowed = new Map<string, LocalAssetType>()

  const collectItem = (item: PlaylistItem): void => {
    if (
      isLocalAssetType(item.type) &&
      !isDirectMediaUrl(item.src) &&
      !isBundledMediaSource(item.src)
    ) {
      allowed.set(item.src, item.type)
    }

    if (
      item.fallbackSrc &&
      !isDirectMediaUrl(item.fallbackSrc) &&
      !isBundledMediaSource(item.fallbackSrc)
    ) {
      allowed.set(item.fallbackSrc, 'image')
    }
  }

  config.playlists.forEach((playlist) => playlist.items.forEach(collectItem))
  Object.values(config.displays).forEach((display) => {
    display.playlists.forEach((playlist) => playlist.items.forEach(collectItem))
  })

  return allowed
}

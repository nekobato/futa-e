import { coerceConfig, createDefaultConfig } from './defaults'
import type { PlayerConfig } from './types'
import { isRecord } from './utils'

export type ConfigManagementMode = 'local' | 'cloud'

export type CloudConfigState = {
  cachedConfig: PlayerConfig
  etag: string | null
  lastFetchedAt: string | null
  manifestUrl: string | null
}

export type StoredConfigDocument = {
  version: 1
  mode: ConfigManagementMode
  localConfig: PlayerConfig
  cloud: CloudConfigState
  updatedAt: string
}

const cloneConfig = (config: PlayerConfig): PlayerConfig => coerceConfig(config)

const createDefaultCloudConfigState = (
  localConfig: PlayerConfig = createDefaultConfig()
): CloudConfigState => ({
  cachedConfig: cloneConfig(localConfig),
  etag: null,
  lastFetchedAt: null,
  manifestUrl: null
})

export const createDefaultStoredConfigDocument = (): StoredConfigDocument => {
  const localConfig = createDefaultConfig()

  return {
    version: 1,
    mode: 'local',
    localConfig,
    cloud: createDefaultCloudConfigState(localConfig),
    updatedAt: localConfig.updatedAt
  }
}

const isLegacyPlayerConfig = (value: Record<string, unknown>): boolean =>
  'activePlaylistId' in value ||
  'playlists' in value ||
  'playlist' in value ||
  'displayMode' in value

const coerceCloudConfigState = (
  value: unknown,
  localConfig: PlayerConfig
): CloudConfigState => {
  if (!isRecord(value)) {
    return createDefaultCloudConfigState(localConfig)
  }

  return {
    cachedConfig: coerceConfig(value.cachedConfig ?? localConfig),
    etag: typeof value.etag === 'string' ? value.etag : null,
    lastFetchedAt:
      typeof value.lastFetchedAt === 'string' ? value.lastFetchedAt : null,
    manifestUrl:
      typeof value.manifestUrl === 'string' &&
      value.manifestUrl.trim().length > 0
        ? value.manifestUrl
        : null
  }
}

export const coerceStoredConfigDocument = (
  raw: unknown
): StoredConfigDocument => {
  const fallback = createDefaultStoredConfigDocument()

  if (!isRecord(raw)) {
    return fallback
  }

  if (isLegacyPlayerConfig(raw)) {
    const localConfig = coerceConfig(raw)
    return {
      version: 1,
      mode: 'local',
      localConfig,
      cloud: createDefaultCloudConfigState(localConfig),
      updatedAt: localConfig.updatedAt
    }
  }

  const localConfig = coerceConfig(raw.localConfig)

  return {
    version: 1,
    mode: raw.mode === 'cloud' ? 'cloud' : 'local',
    localConfig,
    cloud: coerceCloudConfigState(raw.cloud, localConfig),
    updatedAt:
      typeof raw.updatedAt === 'string' ? raw.updatedAt : localConfig.updatedAt
  }
}

export const resolvePlaybackConfig = (
  document: StoredConfigDocument
): PlayerConfig =>
  document.mode === 'cloud'
    ? cloneConfig(document.cloud.cachedConfig)
    : cloneConfig(document.localConfig)

export const updateLocalConfigDocument = (
  document: StoredConfigDocument,
  localConfig: PlayerConfig
): StoredConfigDocument => {
  const nextLocalConfig = coerceConfig(localConfig)

  return {
    ...document,
    localConfig: nextLocalConfig,
    updatedAt: nextLocalConfig.updatedAt
  }
}

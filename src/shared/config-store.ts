import { coerceConfig, createDefaultConfig } from './defaults'
import type { PlayerConfig } from './types'
import { isRecord } from './utils'

export type StoredConfig = PlayerConfig

export const createDefaultStoredConfig = (): StoredConfig =>
  createDefaultConfig()

export const coerceStoredConfig = (raw: unknown): StoredConfig => {
  if (isRecord(raw) && isRecord(raw.localConfig)) {
    return coerceConfig(raw.localConfig)
  }

  return coerceConfig(raw)
}

export const cloneStoredConfig = (config: PlayerConfig): StoredConfig =>
  coerceConfig(config)

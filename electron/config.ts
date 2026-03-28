import Store from 'electron-store'
import { existsSync } from 'node:fs'
import {
  cloneStoredConfig,
  coerceStoredConfig,
  createDefaultStoredConfig,
  type StoredConfig
} from '../src/shared/config-store'
import type { ConfigDiagnostics } from '../src/shared/ipc'
import type { PlayerConfig } from '../src/shared/types'

export type ConfigRepository = {
  getDiagnostics: () => Promise<ConfigDiagnostics>
  getConfigPath: () => string
  loadConfig: () => Promise<PlayerConfig>
  loadPlaybackConfig: () => Promise<PlayerConfig>
  saveConfig: (config: PlayerConfig) => Promise<PlayerConfig>
}

/** Returns the application's persisted configuration store. */
const createConfigStore = (): Store<StoredConfig> =>
  new Store<StoredConfig>({
    defaults: createDefaultStoredConfig(),
    name: 'futae-config'
  })

/** Normalizes raw store contents into the current config shape. */
const createConfigReader = (
  store: Store<StoredConfig>
): (() => StoredConfig) => {
  return () => {
    const raw = store.store
    const normalized = coerceStoredConfig(raw)

    if (
      !existsSync(store.path) ||
      JSON.stringify(raw) !== JSON.stringify(normalized)
    ) {
      store.store = normalized
    }

    return normalized
  }
}

/** Creates the repository that bridges Electron Store and the app config model. */
export const createConfigRepository = (): ConfigRepository => {
  const store = createConfigStore()
  const readFromStore = createConfigReader(store)

  const getConfigPath = (): string => store.path

  return {
    getDiagnostics: async () => ({
      backend: 'electron-store',
      configExists: existsSync(store.path),
      configPath: store.path
    }),
    getConfigPath,
    loadConfig: async () => readFromStore(),
    loadPlaybackConfig: async () => readFromStore(),
    saveConfig: async (config) => {
      const next = cloneStoredConfig(config)
      store.store = next
      return next
    }
  }
}

let configRepository: ConfigRepository | null = null

/** Returns a lazily-initialized configuration repository. */
const getConfigRepository = (): ConfigRepository => {
  configRepository ??= createConfigRepository()
  return configRepository
}

export const loadConfig = async (): Promise<PlayerConfig> =>
  getConfigRepository().loadConfig()

export const loadPlaybackConfig = async (): Promise<PlayerConfig> =>
  getConfigRepository().loadPlaybackConfig()

export const saveConfig = async (config: PlayerConfig): Promise<PlayerConfig> =>
  getConfigRepository().saveConfig(config)

export const getConfigPath = (): string => getConfigRepository().getConfigPath()

export const getConfigDiagnostics = async (): Promise<ConfigDiagnostics> =>
  getConfigRepository().getDiagnostics()

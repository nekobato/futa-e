import { app } from 'electron'
import Store from 'electron-store'
import { join } from 'node:path'
import {
  coerceStoredConfigDocument,
  createDefaultStoredConfigDocument,
  resolvePlaybackConfig,
  updateLocalConfigDocument,
  type StoredConfigDocument
} from '../src/shared/config-store'
import type { PlayerConfig } from '../src/shared/types'

export type ConfigRepository = {
  getConfigPath: () => string
  loadEditableConfig: () => Promise<PlayerConfig>
  loadPlaybackConfig: () => Promise<PlayerConfig>
  readDocument: () => Promise<StoredConfigDocument>
  saveEditableConfig: (config: PlayerConfig) => Promise<PlayerConfig>
  writeDocument: (
    document: StoredConfigDocument
  ) => Promise<StoredConfigDocument>
}

const getConfigPath = (): string =>
  join(app.getPath('userData'), 'futae-config.json')

const createDocumentStore = () =>
  new Store<StoredConfigDocument>({
    cwd: app.getPath('userData'),
    defaults: createDefaultStoredConfigDocument(),
    name: 'futae-config'
  })

const createDocumentReader = (
  store: Store<StoredConfigDocument>
): (() => StoredConfigDocument) => {
  return () => {
    const raw = store.store
    const normalized = coerceStoredConfigDocument(raw)

    if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
      store.store = normalized
    }

    return normalized
  }
}

export const createConfigRepository = (): ConfigRepository => {
  const store = createDocumentStore()
  const readFromStore = createDocumentReader(store)

  const readDocument = async (): Promise<StoredConfigDocument> =>
    readFromStore()

  const writeDocument = async (
    document: StoredConfigDocument
  ): Promise<StoredConfigDocument> => {
    const normalized = coerceStoredConfigDocument(document)
    store.store = normalized
    return normalized
  }

  return {
    getConfigPath,
    loadEditableConfig: async () => readFromStore().localConfig,
    loadPlaybackConfig: async () => resolvePlaybackConfig(readFromStore()),
    readDocument,
    saveEditableConfig: async (config) => {
      const current = readFromStore()
      const next = updateLocalConfigDocument(current, config)
      const saved = await writeDocument(next)
      return saved.localConfig
    },
    writeDocument
  }
}

const configRepository = createConfigRepository()

export const loadConfig = async (): Promise<PlayerConfig> =>
  configRepository.loadEditableConfig()

export const loadPlaybackConfig = async (): Promise<PlayerConfig> =>
  configRepository.loadPlaybackConfig()

export const saveConfig = async (config: PlayerConfig): Promise<PlayerConfig> =>
  configRepository.saveEditableConfig(config)

export const readConfigDocument = async (): Promise<StoredConfigDocument> =>
  configRepository.readDocument()

export const writeConfigDocument = async (
  document: StoredConfigDocument
): Promise<StoredConfigDocument> => configRepository.writeDocument(document)

export { getConfigPath }

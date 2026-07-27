import Store from 'electron-store'
import { realpath, stat } from 'node:fs/promises'
import {
  coerceLocalAssetRegistry,
  createDefaultLocalAssetRegistry,
  createLocalAssetRegistry,
  type LocalAssetRegistry,
  type StoredLocalAssetRegistry
} from './local-asset-registry'

/** Creates the main-process-only metadata store for external local assets. */
const createLocalAssetStore = (): Store<StoredLocalAssetRegistry> =>
  new Store<StoredLocalAssetRegistry>({
    defaults: createDefaultLocalAssetRegistry(),
    name: 'futae-assets'
  })

let localAssetRegistry: LocalAssetRegistry | null = null

/** Returns the lazily initialized external-asset permission registry. */
export const getLocalAssetRegistry = (): LocalAssetRegistry => {
  if (localAssetRegistry) {
    return localAssetRegistry
  }

  const store = createLocalAssetStore()
  localAssetRegistry = createLocalAssetRegistry({
    storage: {
      read: () => {
        const normalized = coerceLocalAssetRegistry(store.store)
        if (JSON.stringify(store.store) !== JSON.stringify(normalized)) {
          store.store = normalized
        }
        return normalized
      },
      write: (document) => {
        store.store = document
      }
    },
    fileSystem: {
      realpath,
      stat
    }
  })

  return localAssetRegistry
}

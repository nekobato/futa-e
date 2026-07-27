import { randomUUID } from 'node:crypto'
import { basename } from 'node:path'
import type { Stats } from 'node:fs'
import type { PickedAsset } from '../src/shared/types'
import type { LocalAssetType } from '../src/shared/local-assets'
import { isLocalAssetType, isOpaqueAssetId } from '../src/shared/local-assets'
import {
  inferAssetTypeFromPath,
  localAssetMimeTypeFromPath
} from '../src/shared/picked-assets'
import { isRecord } from '../src/shared/utils'

export type LocalAssetRecord = {
  id: string
  path: string
  realPath: string | null
  type: LocalAssetType
  name: string
}

export type StoredLocalAssetRegistry = {
  version: 1
  assets: Record<string, LocalAssetRecord>
}

export type ResolvedLocalAsset = LocalAssetRecord & {
  realPath: string
  mimeType: string
  size: number
}

type LocalAssetRegistryStorage = {
  read: () => unknown
  write: (document: StoredLocalAssetRegistry) => void
}

type LocalAssetFileSystem = {
  realpath: (filePath: string) => Promise<string>
  stat: (filePath: string) => Promise<Pick<Stats, 'isFile' | 'size'>>
}

export type LocalAssetRegistry = {
  get: (assetId: string) => LocalAssetRecord | null
  has: (assetId: string, type?: LocalAssetType) => boolean
  register: (
    filePath: string,
    requestedKind: LocalAssetType | 'media'
  ) => Promise<PickedAsset | null>
  registerLegacy: (
    filePath: string,
    type: LocalAssetType
  ) => Promise<PickedAsset>
  resolve: (
    assetId: string,
    type?: LocalAssetType
  ) => Promise<ResolvedLocalAsset | null>
}

/** Creates the empty document persisted by the local-asset registry. */
export const createDefaultLocalAssetRegistry =
  (): StoredLocalAssetRegistry => ({
    version: 1,
    assets: {}
  })

/** Normalizes persisted registry metadata without exposing it to renderers. */
export const coerceLocalAssetRegistry = (
  raw: unknown
): StoredLocalAssetRegistry => {
  if (!isRecord(raw) || !isRecord(raw.assets)) {
    return createDefaultLocalAssetRegistry()
  }

  const assets = Object.entries(raw.assets).reduce<
    Record<string, LocalAssetRecord>
  >((records, [assetId, value]) => {
    const type = isRecord(value) ? String(value.type) : ''
    if (
      !isOpaqueAssetId(assetId) ||
      !isRecord(value) ||
      typeof value.path !== 'string' ||
      !isLocalAssetType(type)
    ) {
      return records
    }

    records[assetId] = {
      id: assetId,
      path: value.path,
      realPath: typeof value.realPath === 'string' ? value.realPath : null,
      type,
      name:
        typeof value.name === 'string' && value.name.length > 0
          ? value.name
          : basename(value.path)
    }
    return records
  }, {})

  return {
    version: 1,
    assets
  }
}

/**
 * Creates a main-process registry for user-selected external media files.
 */
export const createLocalAssetRegistry = ({
  storage,
  fileSystem,
  createAssetId = randomUUID
}: {
  storage: LocalAssetRegistryStorage
  fileSystem: LocalAssetFileSystem
  createAssetId?: () => string
}): LocalAssetRegistry => {
  const read = (): StoredLocalAssetRegistry =>
    coerceLocalAssetRegistry(storage.read())

  const writeRecord = (record: LocalAssetRecord): void => {
    const document = read()
    storage.write({
      ...document,
      assets: {
        ...document.assets,
        [record.id]: record
      }
    })
  }

  const findExisting = (
    document: StoredLocalAssetRegistry,
    filePath: string,
    realPath: string | null,
    type: LocalAssetType
  ): LocalAssetRecord | null =>
    Object.values(document.assets).find(
      (record) =>
        record.type === type &&
        (realPath
          ? record.realPath === realPath
          : record.realPath === null && record.path === filePath)
    ) ?? null

  const toPickedAsset = (record: LocalAssetRecord): PickedAsset => ({
    id: record.id,
    type: record.type,
    name: record.name
  })

  const inspectPath = async (
    filePath: string
  ): Promise<{ realPath: string; size: number } | null> => {
    try {
      const resolvedPath = await fileSystem.realpath(filePath)
      const fileStats = await fileSystem.stat(resolvedPath)
      return fileStats.isFile()
        ? { realPath: resolvedPath, size: fileStats.size }
        : null
    } catch {
      return null
    }
  }

  const register = async (
    filePath: string,
    requestedKind: LocalAssetType | 'media'
  ): Promise<PickedAsset | null> => {
    const inferredType = inferAssetTypeFromPath(filePath)
    if (
      !inferredType ||
      !isLocalAssetType(inferredType) ||
      (requestedKind !== 'media' && requestedKind !== inferredType)
    ) {
      return null
    }

    const inspected = await inspectPath(filePath)
    if (!inspected) {
      return null
    }

    const document = read()
    const existing = findExisting(
      document,
      filePath,
      inspected.realPath,
      inferredType
    )
    if (existing) {
      return toPickedAsset(existing)
    }

    const record: LocalAssetRecord = {
      id: createAssetId(),
      path: filePath,
      realPath: inspected.realPath,
      type: inferredType,
      name: basename(filePath)
    }
    writeRecord(record)
    return toPickedAsset(record)
  }

  const registerLegacy = async (
    filePath: string,
    type: LocalAssetType
  ): Promise<PickedAsset> => {
    const inspected = await inspectPath(filePath)
    const document = read()
    const existing = findExisting(
      document,
      filePath,
      inspected?.realPath ?? null,
      type
    )
    if (existing) {
      return toPickedAsset(existing)
    }

    const record: LocalAssetRecord = {
      id: createAssetId(),
      path: filePath,
      realPath: inspected?.realPath ?? null,
      type,
      name: basename(filePath)
    }
    writeRecord(record)
    return toPickedAsset(record)
  }

  const get = (assetId: string): LocalAssetRecord | null =>
    read().assets[assetId] ?? null

  const has = (assetId: string, type?: LocalAssetType): boolean => {
    const record = get(assetId)
    return Boolean(record && (!type || record.type === type))
  }

  const resolve = async (
    assetId: string,
    type?: LocalAssetType
  ): Promise<ResolvedLocalAsset | null> => {
    const record = get(assetId)
    if (!record || (type && record.type !== type)) {
      return null
    }

    const mimeType = localAssetMimeTypeFromPath(record.path)
    const inferredType = inferAssetTypeFromPath(record.path)
    if (!mimeType || inferredType !== record.type) {
      return null
    }

    const inspected = await inspectPath(record.path)
    if (
      !inspected ||
      (record.realPath !== null && record.realPath !== inspected.realPath)
    ) {
      return null
    }

    const resolvedRecord =
      record.realPath === null
        ? {
            ...record,
            realPath: inspected.realPath
          }
        : record

    if (record.realPath === null) {
      writeRecord(resolvedRecord)
    }

    return {
      ...resolvedRecord,
      realPath: inspected.realPath,
      mimeType,
      size: inspected.size
    }
  }

  return {
    get,
    has,
    register,
    registerLegacy,
    resolve
  }
}

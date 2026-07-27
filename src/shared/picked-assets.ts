import type { AssetType } from './types'

const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.svg'
] as const
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.avi'] as const

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo'
} as const

/** Returns the file extensions accepted by the native media picker. */
export const dialogExtensionsForKind = (
  kind: 'image' | 'video' | 'media'
): string[] => {
  if (kind === 'image') {
    return [...IMAGE_EXTENSIONS]
  }

  if (kind === 'video') {
    return [...VIDEO_EXTENSIONS]
  }

  return [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]
}

/** Returns the normalized extension from a filesystem path. */
const extensionFromPath = (filePath: string): string => {
  const lowerPath = filePath.toLowerCase()
  const separatorIndex = Math.max(
    lowerPath.lastIndexOf('/'),
    lowerPath.lastIndexOf('\\')
  )
  const fileName = lowerPath.slice(separatorIndex + 1)
  const extensionIndex = fileName.lastIndexOf('.')

  return extensionIndex >= 0 ? fileName.slice(extensionIndex) : ''
}

/** Infers the supported local-media type from a path extension. */
export const inferAssetTypeFromPath = (filePath: string): AssetType | null => {
  const extension = extensionFromPath(filePath)

  if (
    IMAGE_EXTENSIONS.includes(extension as (typeof IMAGE_EXTENSIONS)[number])
  ) {
    return 'image'
  }

  if (
    VIDEO_EXTENSIONS.includes(extension as (typeof VIDEO_EXTENSIONS)[number])
  ) {
    return 'video'
  }

  return null
}

/** Returns the fixed response MIME type for a supported local-media path. */
export const localAssetMimeTypeFromPath = (filePath: string): string | null => {
  const extension = extensionFromPath(filePath)
  return MIME_TYPES[extension as keyof typeof MIME_TYPES] ?? null
}

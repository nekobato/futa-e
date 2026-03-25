import type { AssetType, PickedAsset } from './types'
import { titleFromPath } from './utils'

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

export const inferAssetTypeFromPath = (filePath: string): AssetType | null => {
  const lowerPath = filePath.toLowerCase()
  const dotIndex = Math.max(
    lowerPath.lastIndexOf('/'),
    lowerPath.lastIndexOf('\\')
  )
  const fileName = lowerPath.slice(dotIndex + 1)
  const extensionIndex = fileName.lastIndexOf('.')
  const extension = extensionIndex >= 0 ? fileName.slice(extensionIndex) : ''

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

export const toPickedAssetFromPath = (
  filePath: string,
  requestedKind: 'image' | 'video' | 'media' = 'media'
): PickedAsset | null => {
  const type =
    requestedKind === 'media' ? inferAssetTypeFromPath(filePath) : requestedKind

  if (!type) {
    return null
  }

  return {
    path: filePath,
    type,
    name: titleFromPath(filePath)
  }
}

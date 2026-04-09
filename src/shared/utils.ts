const UNIX_LOCAL_FILE_PREFIXES = [
  '/Applications/',
  '/Library/',
  '/Users/',
  '/Volumes/',
  '/home/',
  '/media/',
  '/mnt/',
  '/opt/',
  '/private/',
  '/tmp/',
  '/var/'
] as const

/**
 * Creates a stable identifier for persisted entities.
 */
export const createId = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Narrows unknown values to plain record-like objects.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Returns the trailing filename-like segment from a path or URL.
 */
export const titleFromPath = (value: string): string => {
  const parts = value.split(/[/\\]/)
  return parts[parts.length - 1] || value
}

/**
 * Clamps a numeric value into the provided inclusive range.
 */
export const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/**
 * Detects absolute filesystem paths that should be resolved as local media.
 */
export const isLikelyLocalFilePath = (value: string): boolean =>
  /^[A-Za-z]:[\\/]/.test(value) ||
  value.startsWith('\\\\') ||
  UNIX_LOCAL_FILE_PREFIXES.some((prefix) => value.startsWith(prefix))

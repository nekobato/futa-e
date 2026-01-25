export const createId = (): string => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const titleFromPath = (value: string): string => {
  const parts = value.split(/[/\\]/)
  return parts[parts.length - 1] || value
}

export const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

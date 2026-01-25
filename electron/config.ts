import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { PlayerConfig } from '../src/shared/types'
import { coerceConfig, createDefaultConfig } from '../src/shared/defaults'

const getConfigPath = (): string => join(app.getPath('userData'), 'futae-config.json')

export const loadConfig = async (): Promise<PlayerConfig> => {
  try {
    const raw = await fs.readFile(getConfigPath(), 'utf-8')
    return coerceConfig(JSON.parse(raw))
  } catch {
    return createDefaultConfig()
  }
}

export const saveConfig = async (config: PlayerConfig): Promise<PlayerConfig> => {
  const next = {
    ...config,
    updatedAt: new Date().toISOString()
  }
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(getConfigPath(), JSON.stringify(next, null, 2), 'utf-8')
  return next
}

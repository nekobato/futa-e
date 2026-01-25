import { contextBridge, ipcRenderer } from 'electron'
import { pathToFileURL } from 'node:url'
import type { AssetType } from '../src/shared/types'
import type { AssetPickOptions, FutaeApi } from '../src/shared/ipc'

const api: FutaeApi = {
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    save: (next) => ipcRenderer.invoke('config:save', next),
    onUpdated: (handler) => {
      const listener = (_event: unknown, config: unknown) => {
        handler(config as Parameters<typeof handler>[0])
      }
      ipcRenderer.on('config:updated', listener)
      return () => ipcRenderer.removeListener('config:updated', listener)
    }
  },
  assets: {
    pickFiles: (options?: AssetPickOptions) => ipcRenderer.invoke('assets:pick-files', options),
    pickFolder: () => ipcRenderer.invoke('assets:pick-folder'),
    cacheRemote: (url: string, type: AssetType) =>
      ipcRenderer.invoke('assets:cache-remote', { url, type })
  },
  player: {
    start: () => ipcRenderer.invoke('player:start'),
    stop: () => ipcRenderer.invoke('player:stop'),
    status: () => ipcRenderer.invoke('player:status'),
    setPrivacy: (enabled: boolean) => ipcRenderer.invoke('player:set-privacy', enabled),
    onPrivacy: (handler) => {
      const listener = (_event: unknown, enabled: boolean) => {
        handler(enabled)
      }
      ipcRenderer.on('player:privacy', listener)
      return () => ipcRenderer.removeListener('player:privacy', listener)
    },
    heartbeat: () => ipcRenderer.send('player:heartbeat')
  },
  utils: {
    toFileUrl: (filePath: string) => pathToFileURL(filePath).toString()
  }
}

contextBridge.exposeInMainWorld('futae', api)

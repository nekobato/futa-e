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
    pickFiles: (options?: AssetPickOptions) =>
      ipcRenderer.invoke('assets:pick-files', options),
    pickFolder: () => ipcRenderer.invoke('assets:pick-folder'),
    cacheRemote: (url: string, type: AssetType) =>
      ipcRenderer.invoke('assets:cache-remote', { url, type })
  },
  displays: {
    list: () => ipcRenderer.invoke('displays:list'),
    onChanged: (handler) => {
      const listener = (_event: unknown, displays: unknown) => {
        handler(displays as Parameters<typeof handler>[0])
      }
      ipcRenderer.on('displays:changed', listener)
      return () => ipcRenderer.removeListener('displays:changed', listener)
    }
  },
  player: {
    start: () => ipcRenderer.invoke('player:start'),
    stop: () => ipcRenderer.invoke('player:stop'),
    status: () => ipcRenderer.invoke('player:status'),
    setOverlay: (enabled: boolean) =>
      ipcRenderer.invoke('player:set-overlay', enabled),
    onOverlay: (handler) => {
      const listener = (_event: unknown, enabled: boolean) => {
        handler(enabled)
      }
      ipcRenderer.on('player:overlay', listener)
      return () => ipcRenderer.removeListener('player:overlay', listener)
    },
    heartbeat: () => ipcRenderer.send('player:heartbeat')
  },
  utils: {
    toFileUrl: (filePath: string) => pathToFileURL(filePath).toString()
  }
}

contextBridge.exposeInMainWorld('futae', api)

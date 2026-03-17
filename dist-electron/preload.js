"use strict";
const electron = require("electron");
const node_url = require("node:url");
const api = {
  config: {
    get: () => electron.ipcRenderer.invoke("config:get"),
    save: (next) => electron.ipcRenderer.invoke("config:save", next),
    onUpdated: (handler) => {
      const listener = (_event, config) => {
        handler(config);
      };
      electron.ipcRenderer.on("config:updated", listener);
      return () => electron.ipcRenderer.removeListener("config:updated", listener);
    }
  },
  assets: {
    pickFiles: (options) => electron.ipcRenderer.invoke("assets:pick-files", options),
    pickFolder: () => electron.ipcRenderer.invoke("assets:pick-folder"),
    cacheRemote: (url, type) => electron.ipcRenderer.invoke("assets:cache-remote", { url, type })
  },
  displays: {
    list: () => electron.ipcRenderer.invoke("displays:list")
  },
  player: {
    start: () => electron.ipcRenderer.invoke("player:start"),
    stop: () => electron.ipcRenderer.invoke("player:stop"),
    status: () => electron.ipcRenderer.invoke("player:status"),
    setOverlay: (enabled) => electron.ipcRenderer.invoke("player:set-overlay", enabled),
    onOverlay: (handler) => {
      const listener = (_event, enabled) => {
        handler(enabled);
      };
      electron.ipcRenderer.on("player:overlay", listener);
      return () => electron.ipcRenderer.removeListener("player:overlay", listener);
    },
    heartbeat: () => electron.ipcRenderer.send("player:heartbeat")
  },
  utils: {
    toFileUrl: (filePath) => node_url.pathToFileURL(filePath).toString()
  }
};
electron.contextBridge.exposeInMainWorld("futae", api);

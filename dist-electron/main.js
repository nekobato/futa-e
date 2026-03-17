"use strict";
const electron = require("electron");
const node_url = require("node:url");
const node_path = require("node:path");
const node_fs = require("node:fs");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const createId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
const isRecord = (value) => typeof value === "object" && value !== null;
const titleFromPath = (value) => {
  const parts = value.split(/[/\\]/);
  return parts[parts.length - 1] || value;
};
const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);
const createDefaultOverlayConfig = () => ({
  title: "Overlay",
  message: "Display is covered."
});
const createDefaultConfig = () => ({
  version: 1,
  playlist: [],
  loop: true,
  shuffle: false,
  defaultDurationSec: 10,
  webTimeoutSec: 8,
  overlay: createDefaultOverlayConfig(),
  displayMode: "mirror",
  displays: {},
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
});
const isAssetType = (value) => value === "image" || value === "video" || value === "web";
const clonePlaylist = (playlist) => playlist.map((item) => ({ ...item }));
const cloneOverlay = (overlay) => ({
  title: overlay.title,
  message: overlay.message,
  imageSrc: overlay.imageSrc
});
const normalizeItem = (item) => {
  if (!isRecord(item)) {
    return null;
  }
  const type = isAssetType(item.type) ? item.type : null;
  const src = typeof item.src === "string" ? item.src : "";
  if (!type || !src) {
    return null;
  }
  const title = typeof item.title === "string" ? item.title : titleFromPath(src);
  const durationRaw = typeof item.durationSec === "number" ? item.durationSec : void 0;
  const durationSec = durationRaw ? clampNumber(durationRaw, 1, 36e3) : void 0;
  return {
    id: typeof item.id === "string" ? item.id : createId(),
    type,
    title,
    src,
    originUrl: typeof item.originUrl === "string" ? item.originUrl : void 0,
    durationSec,
    fallbackSrc: typeof item.fallbackSrc === "string" ? item.fallbackSrc : void 0,
    mute: typeof item.mute === "boolean" ? item.mute : false
  };
};
const normalizeOverlayConfig = (value, fallback) => {
  if (!isRecord(value)) {
    return cloneOverlay(fallback);
  }
  return {
    title: typeof value.title === "string" && value.title.trim().length > 0 ? value.title : fallback.title,
    message: typeof value.message === "string" && value.message.trim().length > 0 ? value.message : fallback.message,
    imageSrc: typeof value.imageSrc === "string" ? value.imageSrc : fallback.imageSrc
  };
};
const normalizeDisplayConfig = (value, fallbackPlaylist, fallbackOverlay) => {
  if (!isRecord(value)) {
    return null;
  }
  const playlist = Array.isArray(value.playlist) ? value.playlist.map((item) => normalizeItem(item)).filter((item) => Boolean(item)) : clonePlaylist(fallbackPlaylist);
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : true,
    playlist,
    overlay: normalizeOverlayConfig(value.overlay, fallbackOverlay)
  };
};
const coerceConfig = (raw) => {
  const base = createDefaultConfig();
  if (!isRecord(raw)) {
    return base;
  }
  const playlist = Array.isArray(raw.playlist) ? raw.playlist.map((item) => normalizeItem(item)).filter((item) => Boolean(item)) : base.playlist;
  const loop = typeof raw.loop === "boolean" ? raw.loop : base.loop;
  const shuffle = typeof raw.shuffle === "boolean" ? raw.shuffle : base.shuffle;
  const defaultDurationSec = typeof raw.defaultDurationSec === "number" ? clampNumber(raw.defaultDurationSec, 2, 36e3) : base.defaultDurationSec;
  const webTimeoutSec = typeof raw.webTimeoutSec === "number" ? clampNumber(raw.webTimeoutSec, 2, 120) : base.webTimeoutSec;
  const overlay = normalizeOverlayConfig(raw.overlay, base.overlay);
  const displayMode = raw.displayMode === "mirror" || raw.displayMode === "per-display" ? raw.displayMode : base.displayMode;
  const displays = isRecord(raw.displays) ? Object.entries(raw.displays).reduce(
    (accumulator, [displayId, value]) => {
      const normalized = normalizeDisplayConfig(value, playlist, overlay);
      if (normalized) {
        accumulator[displayId] = normalized;
      }
      return accumulator;
    },
    {}
  ) : base.displays;
  return {
    version: 1,
    playlist,
    loop,
    shuffle,
    defaultDurationSec,
    webTimeoutSec,
    overlay,
    displayMode,
    displays,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : base.updatedAt
  };
};
const getConfigPath = () => node_path.join(electron.app.getPath("userData"), "futae-config.json");
const loadConfig = async () => {
  try {
    const raw = await node_fs.promises.readFile(getConfigPath(), "utf-8");
    return coerceConfig(JSON.parse(raw));
  } catch {
    return createDefaultConfig();
  }
};
const saveConfig = async (config) => {
  const next = {
    ...config,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  await node_fs.promises.mkdir(electron.app.getPath("userData"), { recursive: true });
  await node_fs.promises.writeFile(getConfigPath(), JSON.stringify(next, null, 2), "utf-8");
  return next;
};
const __filename$1 = node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href);
const __dirname$1 = node_path.dirname(__filename$1);
const IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".svg"
]);
const VIDEO_EXTENSIONS = /* @__PURE__ */ new Set([".mp4", ".mov", ".webm", ".mkv", ".avi"]);
let controlWindow = null;
let playerWindows = [];
let currentConfig = createDefaultConfig();
let overlayEnabled = false;
const heartbeatMap = /* @__PURE__ */ new Map();
let heartbeatInterval = null;
const getPreloadPath = () => node_path.join(__dirname$1, "../preload/index.js");
const getRendererUrl = (view, params = {}) => {
  const base = process.env.VITE_DEV_SERVER_URL ?? node_url.pathToFileURL(node_path.join(electron.app.getAppPath(), "dist/index.html")).toString();
  const search = new URLSearchParams({ view, ...params }).toString();
  return `${base}?${search}`;
};
const inferAssetType = (filePath) => {
  const ext = node_path.extname(filePath).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  return null;
};
const pickFiles = async (kind = "media") => {
  const filters = [];
  if (kind === "image" || kind === "media") {
    filters.push({
      name: "Images",
      extensions: Array.from(IMAGE_EXTENSIONS).map((ext) => ext.slice(1))
    });
  }
  if (kind === "video" || kind === "media") {
    filters.push({
      name: "Videos",
      extensions: Array.from(VIDEO_EXTENSIONS).map((ext) => ext.slice(1))
    });
  }
  const dialogOptions = {
    properties: [
      "openFile",
      "multiSelections"
    ],
    filters
  };
  const result = controlWindow ? await electron.dialog.showOpenDialog(controlWindow, dialogOptions) : await electron.dialog.showOpenDialog(dialogOptions);
  if (result.canceled) {
    return [];
  }
  return result.filePaths.map((path) => {
    const type = inferAssetType(path);
    return type ? { path, type } : null;
  }).filter((asset) => Boolean(asset));
};
const pickFolder = async () => {
  const dialogOptions = {
    properties: ["openDirectory"]
  };
  const result = controlWindow ? await electron.dialog.showOpenDialog(controlWindow, dialogOptions) : await electron.dialog.showOpenDialog(dialogOptions);
  if (result.canceled || result.filePaths.length === 0) {
    return [];
  }
  const folderPath = result.filePaths[0];
  const entries = await node_fs.promises.readdir(folderPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => node_path.join(folderPath, entry.name)).map((path) => {
    const type = inferAssetType(path);
    return type ? { path, type } : null;
  }).filter((asset) => Boolean(asset));
};
const downloadToFile = async (url, targetPath) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`download failed: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await node_fs.promises.writeFile(targetPath, buffer);
};
const cacheRemoteAsset = async (url, type) => {
  if (type === "web") {
    return null;
  }
  const parsed = new URL(url);
  const ext = node_path.extname(parsed.pathname);
  if (!ext) {
    return null;
  }
  const cacheDir = node_path.join(electron.app.getPath("userData"), "cache");
  await node_fs.promises.mkdir(cacheDir, { recursive: true });
  const fileName = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
  const localPath = node_path.join(cacheDir, fileName);
  try {
    await downloadToFile(url, localPath);
    return { localPath, originalUrl: url };
  } catch {
    return null;
  }
};
const broadcastConfig = (config) => {
  playerWindows.forEach((win) => {
    win.webContents.send("config:updated", config);
  });
};
const startHeartbeatMonitor = () => {
  if (heartbeatInterval) {
    return;
  }
  heartbeatInterval = setInterval(() => {
    const now = Date.now();
    playerWindows.forEach((win) => {
      const last = heartbeatMap.get(win.webContents.id) ?? 0;
      if (last > 0 && now - last > 15e3) {
        win.reload();
      }
    });
  }, 5e3);
};
const stopHeartbeatMonitor = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  heartbeatMap.clear();
};
const createWindow = (view, options, params = {}) => {
  const win = new electron.BrowserWindow({
    ...options,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadURL(getRendererUrl(view, params));
  return win;
};
const listDisplays = () => {
  const primaryDisplayId = electron.screen.getPrimaryDisplay().id;
  return electron.screen.getAllDisplays().map((display) => ({
    id: String(display.id),
    label: display.label?.trim() || `Display ${display.id}`,
    isPrimary: display.id === primaryDisplayId,
    bounds: {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height
    }
  }));
};
const createControlWindow = () => {
  controlWindow = createWindow("control", {
    width: 1200,
    height: 800,
    minWidth: 980,
    minHeight: 720,
    title: "Futa-e Player"
  });
  controlWindow.on("closed", () => {
    controlWindow = null;
  });
};
const createPlayerWindows = () => {
  const displays = currentConfig.displayMode === "per-display" ? electron.screen.getAllDisplays().filter(
    (display) => currentConfig.displays[String(display.id)]?.enabled !== false
  ) : electron.screen.getAllDisplays();
  playerWindows = displays.map((display) => {
    const win = createWindow(
      "player",
      {
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        fullscreen: true,
        frame: false,
        backgroundColor: "#000000",
        show: true
      },
      {
        displayId: String(display.id)
      }
    );
    win.setMenuBarVisibility(false);
    win.on("closed", () => {
      playerWindows = playerWindows.filter((item) => item !== win);
      if (playerWindows.length === 0) {
        stopHeartbeatMonitor();
      }
    });
    win.webContents.on("render-process-gone", () => {
      win.reload();
    });
    win.webContents.once("did-finish-load", () => {
      win.webContents.send("config:updated", currentConfig);
      win.webContents.send("player:overlay", overlayEnabled);
    });
    win.webContents.on("unresponsive", () => {
      win.reload();
    });
    win.webContents.on("responsive", () => {
      heartbeatMap.set(win.webContents.id, Date.now());
    });
    heartbeatMap.set(win.webContents.id, Date.now());
    return win;
  });
  startHeartbeatMonitor();
};
const closePlayerWindows = () => {
  playerWindows.forEach((win) => win.close());
  playerWindows = [];
  stopHeartbeatMonitor();
};
const getStatus = () => ({
  running: playerWindows.length > 0,
  displayCount: playerWindows.length,
  overlayEnabled
});
const updateConfig = async (next) => {
  const normalized = coerceConfig(next);
  currentConfig = await saveConfig(normalized);
  if (playerWindows.length > 0) {
    closePlayerWindows();
    createPlayerWindows();
  }
  broadcastConfig(currentConfig);
  playerWindows.forEach(
    (win) => win.webContents.send("player:overlay", overlayEnabled)
  );
  return currentConfig;
};
electron.app.whenReady().then(async () => {
  currentConfig = await loadConfig();
  createControlWindow();
  electron.globalShortcut.register("CommandOrControl+Shift+P", () => {
    overlayEnabled = !overlayEnabled;
    playerWindows.forEach(
      (win) => win.webContents.send("player:overlay", overlayEnabled)
    );
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (!controlWindow) {
    createControlWindow();
  }
});
electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
});
electron.ipcMain.handle("config:get", () => currentConfig);
electron.ipcMain.handle(
  "config:save",
  async (_event, next) => updateConfig(next)
);
electron.ipcMain.handle(
  "assets:pick-files",
  async (_event, options) => pickFiles(options?.kind ?? "media")
);
electron.ipcMain.handle("assets:pick-folder", async () => pickFolder());
electron.ipcMain.handle(
  "assets:cache-remote",
  async (_event, payload) => cacheRemoteAsset(payload.url, payload.type)
);
electron.ipcMain.handle("displays:list", async () => listDisplays());
electron.ipcMain.handle("player:start", async () => {
  if (playerWindows.length === 0) {
    createPlayerWindows();
    broadcastConfig(currentConfig);
  }
  return getStatus();
});
electron.ipcMain.handle("player:stop", async () => {
  closePlayerWindows();
  return getStatus();
});
electron.ipcMain.handle("player:status", async () => getStatus());
electron.ipcMain.handle("player:set-overlay", async (_event, enabled) => {
  overlayEnabled = enabled;
  playerWindows.forEach(
    (win) => win.webContents.send("player:overlay", enabled)
  );
});
electron.ipcMain.on("player:heartbeat", (event) => {
  heartbeatMap.set(event.sender.id, Date.now());
});

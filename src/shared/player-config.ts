import type {
  DisplayConfig,
  DisplayInfo,
  OverlayConfig,
  PlayerConfig,
  PlaylistItem
} from './types'

export const clonePlaylist = (playlist: PlaylistItem[]): PlaylistItem[] =>
  playlist.map((item) => ({ ...item }))

export const cloneOverlay = (overlay: OverlayConfig): OverlayConfig => ({
  title: overlay.title,
  message: overlay.message,
  imageSrc: overlay.imageSrc
})

export const createDisplayConfig = (config: PlayerConfig): DisplayConfig => ({
  enabled: true,
  playlist: clonePlaylist(config.playlist),
  overlay: cloneOverlay(config.overlay)
})

export const ensureDisplayConfigs = (
  config: PlayerConfig,
  displays: DisplayInfo[]
): PlayerConfig => {
  const nextDisplays = { ...config.displays }

  displays.forEach((display) => {
    const current = nextDisplays[display.id]
    nextDisplays[display.id] = current
      ? {
          enabled: current.enabled,
          playlist: clonePlaylist(current.playlist),
          overlay: cloneOverlay(current.overlay)
        }
      : createDisplayConfig(config)
  })

  return {
    ...config,
    displays: nextDisplays
  }
}

export const getEffectiveDisplayConfig = (
  config: PlayerConfig,
  displayId: string | null
): DisplayConfig => {
  if (!displayId || config.displayMode === 'mirror') {
    return createDisplayConfig(config)
  }

  return config.displays[displayId] ?? createDisplayConfig(config)
}

export const countEnabledDisplays = (
  config: PlayerConfig,
  displays: DisplayInfo[]
): number => {
  if (config.displayMode === 'mirror') {
    return displays.length
  }

  return displays.filter(
    (display) => config.displays[display.id]?.enabled !== false
  ).length
}

const systemDarkModeQuery = '(prefers-color-scheme: dark)'

/** Applies an explicit light or dark state to the application root. */
export const applyQuietAtelierColorScheme = (
  root: HTMLElement,
  isDark: boolean
) => {
  root.classList.toggle('dark', isDark)
  root.dataset.colorScheme = isDark ? 'dark' : 'light'
}

/**
 * Keeps the Element Plus dark-mode class synchronized with the OS preference.
 *
 * @returns A cleanup callback that removes the media-query listener.
 */
export const installQuietAtelierTheme = (
  root: HTMLElement = document.documentElement,
  mediaQuery: MediaQueryList = window.matchMedia(systemDarkModeQuery)
) => {
  const sync = (isDark: boolean) => applyQuietAtelierColorScheme(root, isDark)
  const handleChange = (event: MediaQueryListEvent) => sync(event.matches)

  sync(mediaQuery.matches)
  mediaQuery.addEventListener('change', handleChange)

  return () => mediaQuery.removeEventListener('change', handleChange)
}

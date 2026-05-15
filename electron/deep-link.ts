export type DeepLinkCommand = 'start-player' | 'stop-player' | 'show-control'

export const DEEP_LINK_SCHEME = 'futa-e'

/**
 * Parses supported app deep links into internal player commands.
 */
export const parseDeepLink = (rawUrl: string): DeepLinkCommand | null => {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== `${DEEP_LINK_SCHEME}:`) {
      return null
    }

    const commandPath = `${url.hostname}${url.pathname}`.replace(/\/+$/, '')
    if (commandPath === 'kiosk/start') {
      return 'start-player'
    }
    if (commandPath === 'kiosk/stop') {
      return 'stop-player'
    }
    if (commandPath === 'control/show') {
      return 'show-control'
    }

    return null
  } catch {
    return null
  }
}

/**
 * Finds the first app deep link in a process command-line argument list.
 */
export const findDeepLinkArg = (argv: readonly string[]): string | null =>
  argv.find((arg) => parseDeepLink(arg) !== null) ?? null

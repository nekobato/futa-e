import { describe, expect, it } from 'vitest'
import { findDeepLinkArg, parseDeepLink } from '../../electron/deep-link'

describe('deep link', () => {
  it('parses kiosk start and stop commands', () => {
    expect(parseDeepLink('futa-e://kiosk/start')).toBe('start-player')
    expect(parseDeepLink('futa-e://kiosk/stop')).toBe('stop-player')
  })

  it('parses control window command', () => {
    expect(parseDeepLink('futa-e://control/show')).toBe('show-control')
  })

  it('ignores unsupported schemes and commands', () => {
    expect(parseDeepLink('https://kiosk/start')).toBeNull()
    expect(parseDeepLink('futa-e://kiosk/restart')).toBeNull()
    expect(parseDeepLink('not a url')).toBeNull()
  })

  it('finds the first supported deep link in command-line args', () => {
    expect(findDeepLinkArg(['Futa E', 'futa-e://kiosk/start'])).toBe(
      'futa-e://kiosk/start'
    )
    expect(findDeepLinkArg(['Futa E', 'https://kiosk/start'])).toBeNull()
  })
})

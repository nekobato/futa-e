import { expect, test, type Page } from '@playwright/test'

const seedMockConfig = async (page: Page, config: Record<string, unknown>) => {
  await page.goto('/')
  await page.evaluate((value) => {
    localStorage.setItem('futae:mock:config', JSON.stringify(value))
    localStorage.removeItem('futae:mock:status')
  }, config)
}

test('skips broken media items and advances to the next playable item', async ({
  page
}) => {
  await seedMockConfig(page, {
    version: 1,
    playlists: [
      {
        id: 'shared',
        name: 'プレイリスト 1',
        perDisplay: false,
        loop: true,
        shuffle: false,
        defaultDurationSec: 10,
        webTimeoutSec: 8,
        items: [
          {
            id: 'bad',
            type: 'image',
            title: 'Bad',
            src: '/missing-image.png'
          },
          {
            id: 'good',
            type: 'image',
            title: 'Good',
            src: '/safe-mode.svg'
          }
        ]
      }
    ],
    displays: {},
    updatedAt: '2026-03-17T00:00:00.000Z'
  })

  await page.goto('/?view=player')

  await expect(page.getByAltText('Good')).toBeVisible()
})

test('uses display-specific playlists when the primary playlist is per-display', async ({
  page
}) => {
  await page.addInitScript(() => {
    const details = new EventTarget() as EventTarget & {
      currentScreen?: Record<string, unknown>
      screens: Array<Record<string, unknown>>
    }

    details.screens = [
      {
        label: 'Built-in Display',
        isPrimary: true,
        left: 0,
        top: 0,
        width: 1920,
        height: 1080
      },
      {
        label: 'Projector',
        isPrimary: false,
        left: 1920,
        top: 0,
        width: 1920,
        height: 1080
      }
    ]
    details.currentScreen = details.screens[0]
    window.getScreenDetails = async () => details as never
  })

  await seedMockConfig(page, {
    version: 1,
    playlists: [
      {
        id: 'shared',
        name: 'プレイリスト 1',
        perDisplay: true,
        loop: true,
        shuffle: false,
        defaultDurationSec: 10,
        webTimeoutSec: 8,
        items: [
          {
            id: 'shared-1',
            type: 'image',
            title: 'Shared',
            src: '/missing-image.png'
          }
        ]
      },
      {
        id: 'secondary',
        name: 'プレイリスト 2',
        perDisplay: false,
        loop: true,
        shuffle: false,
        defaultDurationSec: 10,
        webTimeoutSec: 8,
        items: [
          {
            id: 'ignored-secondary',
            type: 'image',
            title: 'Ignored',
            src: '/missing-image-2.png'
          }
        ]
      }
    ],
    displays: {
      'display-1-0-0-1920x1080': {
        enabled: true,
        playlists: [
          {
            id: 'shared',
            name: 'プレイリスト 1',
            perDisplay: true,
            loop: true,
            shuffle: false,
            defaultDurationSec: 10,
            webTimeoutSec: 8,
            items: [
              {
                id: 'display-1',
                type: 'image',
                title: 'Display 1',
                src: '/safe-mode.svg'
              }
            ]
          }
        ]
      },
      'display-2-1920-0-1920x1080': {
        enabled: true,
        playlists: [
          {
            id: 'shared',
            name: 'プレイリスト 1',
            perDisplay: true,
            loop: true,
            shuffle: false,
            defaultDurationSec: 10,
            webTimeoutSec: 8,
            items: [
              {
                id: 'display-2',
                type: 'image',
                title: 'Display 2',
                src: '/safe-mode.svg'
              }
            ]
          },
          {
            id: 'secondary',
            name: 'プレイリスト 2',
            perDisplay: false,
            loop: true,
            shuffle: false,
            defaultDurationSec: 10,
            webTimeoutSec: 8,
            items: [
              {
                id: 'ignored-display-2-secondary',
                type: 'image',
                title: 'Ignored Secondary',
                src: '/missing-image.png'
              }
            ]
          }
        ]
      }
    },
    updatedAt: '2026-03-17T00:00:00.000Z'
  })

  await page.goto('/?view=player&displayId=display-2-1920-0-1920x1080')

  await expect(page.getByAltText('Display 2')).toBeVisible()
})

test('does not play when a per-display playlist cannot resolve the target display', async ({
  page
}) => {
  await page.addInitScript(() => {
    const details = new EventTarget() as EventTarget & {
      currentScreen?: Record<string, unknown>
      screens: Array<Record<string, unknown>>
    }

    details.screens = [
      {
        label: 'Built-in Display',
        isPrimary: true,
        left: 0,
        top: 0,
        width: 1512,
        height: 982
      }
    ]
    details.currentScreen = details.screens[0]
    window.getScreenDetails = async () => details as never
  })

  await seedMockConfig(page, {
    version: 1,
    playlists: [
      {
        id: 'shared',
        name: 'プレイリスト 1',
        perDisplay: true,
        loop: true,
        shuffle: false,
        defaultDurationSec: 10,
        webTimeoutSec: 8,
        items: [
          {
            id: 'shared-1',
            type: 'image',
            title: 'Shared',
            src: '/safe-mode.svg'
          }
        ]
      }
    ],
    displays: {},
    updatedAt: '2026-03-17T00:00:00.000Z'
  })

  await page.goto('/?view=player&displayId=missing-display')

  await expect(
    page.getByRole('heading', { name: '利用できません' })
  ).toBeVisible()
  await expect(
    page.getByText(
      'このプレイリストはモニター個別設定です。対象ディスプレイを検出できないため、再生できません。'
    )
  ).toBeVisible()
})

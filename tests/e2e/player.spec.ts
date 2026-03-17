import { expect, test, type Page } from '@playwright/test'

const seedMockConfig = async (page: Page, config: Record<string, unknown>) => {
  await page.goto('/')
  await page.evaluate((value) => {
    localStorage.setItem('futae:mock:config', JSON.stringify(value))
    localStorage.setItem('futae:mock:overlay', 'false')
    localStorage.removeItem('futae:mock:status')
  }, config)
}

test('skips broken media items and advances to the next playable item', async ({
  page
}) => {
  await seedMockConfig(page, {
    version: 1,
    playlist: [
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
    ],
    loop: true,
    shuffle: false,
    defaultDurationSec: 10,
    webTimeoutSec: 8,
    overlay: {
      title: 'Overlay',
      message: 'Display is covered.'
    },
    displayMode: 'mirror',
    displays: {},
    updatedAt: '2026-03-17T00:00:00.000Z'
  })

  await page.goto('/?view=player')

  await expect(page.getByAltText('Good')).toBeVisible()
})

test("uses display-specific playlists when displayMode is 'per-display'", async ({
  page
}) => {
  await seedMockConfig(page, {
    version: 1,
    playlist: [
      {
        id: 'shared',
        type: 'image',
        title: 'Shared',
        src: '/missing-image.png'
      }
    ],
    loop: true,
    shuffle: false,
    defaultDurationSec: 10,
    webTimeoutSec: 8,
    overlay: {
      title: 'Shared Overlay',
      message: 'Shared message'
    },
    displayMode: 'per-display',
    displays: {
      '1': {
        enabled: true,
        playlist: [
          {
            id: 'display-1',
            type: 'image',
            title: 'Display 1',
            src: '/safe-mode.svg'
          }
        ],
        overlay: {
          title: 'Display 1 Overlay',
          message: 'Display 1 message'
        }
      },
      '2': {
        enabled: true,
        playlist: [
          {
            id: 'display-2',
            type: 'image',
            title: 'Display 2',
            src: '/safe-mode.svg'
          }
        ],
        overlay: {
          title: 'Display 2 Overlay',
          message: 'Display 2 message'
        }
      }
    },
    updatedAt: '2026-03-17T00:00:00.000Z'
  })

  await page.goto('/?view=player&displayId=2')

  await expect(page.getByAltText('Display 2')).toBeVisible()
})

test('uses display-specific overlay settings when the overlay is enabled', async ({
  page
}) => {
  await seedMockConfig(page, {
    version: 1,
    playlist: [],
    loop: true,
    shuffle: false,
    defaultDurationSec: 10,
    webTimeoutSec: 8,
    overlay: {
      title: 'Shared Overlay',
      message: 'Shared message'
    },
    displayMode: 'per-display',
    displays: {
      '1': {
        enabled: true,
        playlist: [],
        overlay: {
          title: 'Display 1 Overlay',
          message: 'Display 1 message'
        }
      },
      '2': {
        enabled: true,
        playlist: [],
        overlay: {
          title: 'Display 2 Overlay',
          message: 'Display 2 message'
        }
      }
    },
    updatedAt: '2026-03-17T00:00:00.000Z'
  })

  await page.goto('/?view=player&displayId=2')
  await page.evaluate(() => {
    localStorage.setItem('futae:mock:overlay', 'true')
    window.dispatchEvent(
      new CustomEvent<boolean>('futae:mock:overlay', { detail: true })
    )
  })

  await expect(
    page.getByRole('heading', { name: 'Display 2 Overlay' })
  ).toBeVisible()
  await expect(page.getByText('Display 2 message')).toBeVisible()
})

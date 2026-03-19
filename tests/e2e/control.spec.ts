import { expect, test } from '@playwright/test'

test('shows per-display editors when individual monitor settings are enabled', async ({
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
      },
      {
        label: 'Studio Display',
        isPrimary: false,
        left: 1512,
        top: 0,
        width: 2560,
        height: 1440
      }
    ]
    details.currentScreen = details.screens[0]
    window.getScreenDetails = async () => details as never
  })

  await page.goto('/?view=control')

  await expect(page.getByText('接続ディスプレイ 2 台')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'プレイリスト' })
  ).toBeVisible()
  await expect(page.getByText('Built-in Display')).toBeVisible()
  await expect(page.getByText('Studio Display')).toBeVisible()
  await expect(page.getByTestId('playlist-list-item')).toHaveCount(1)

  await page.getByTestId('playlist-add-button').click()

  await expect(page.getByTestId('playlist-list-item')).toHaveCount(2)
  await expect(page.getByLabel('プレイリスト名')).toHaveValue('プレイリスト 2')

  await page.getByTestId('per-display-controls').getByRole('switch').click()

  await expect(page.getByRole('tab', { name: '共通' })).toBeVisible()
  await expect(
    page.getByRole('tab', { name: 'Built-in Display' })
  ).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Studio Display' })).toBeVisible()
})

import { expect, test } from '@playwright/test'

const mockDualDisplays = async (page: import('@playwright/test').Page) => {
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
}

test('shows per-display editors when individual monitor settings are enabled', async ({
  page
}) => {
  await mockDualDisplays(page)

  await page.goto('/?view=control')

  await expect(page.getByRole('heading', { name: 'Futa E' })).toBeVisible()
  await expect(page.getByRole('button', { name: '開始' })).toBeVisible()
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

  await expect(page.getByRole('tab', { name: '共通' })).toHaveCount(0)
  await expect(
    page.getByRole('tab', { name: 'Built-in Display' })
  ).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Studio Display' })).toBeVisible()
})

test('restores the main display playlist when leaving individual monitor mode', async ({
  page
}) => {
  await mockDualDisplays(page)
  await page.goto('/?view=control')

  await page.getByTestId('playlist-item-add-button').click()
  await page.getByRole('button', { name: 'ウェブ' }).click()
  await page.getByLabel('URL').fill('https://example.com/base')
  await page.getByRole('button', { name: '決定' }).click()

  await page.getByTestId('per-display-controls').getByRole('switch').click()

  await page.getByTestId('playlist-item-add-button').first().click()
  await page.getByRole('button', { name: 'ウェブ' }).click()
  await page.getByLabel('URL').fill('https://example.com/main-display')
  await page.getByRole('button', { name: '決定' }).click()

  await page.getByRole('tab', { name: 'Studio Display' }).click()
  await page.getByTestId('playlist-item-add-button').last().click()
  await page.getByRole('button', { name: 'ウェブ' }).click()
  await page.getByLabel('URL').fill('https://example.com/studio-display')
  await page.getByRole('button', { name: '決定' }).click()

  await expect(page.getByText('example.com/studio-display')).toBeVisible()

  await page.getByTestId('per-display-controls').getByRole('switch').click()

  await expect(page.getByRole('tab', { name: 'Built-in Display' })).toHaveCount(
    0
  )
  await expect(page.getByText('example.com/main-display')).toBeVisible()
  await expect(page.getByText('example.com/studio-display')).toHaveCount(0)
})

test('adds playlist items through the add-item dialog', async ({ page }) => {
  await page.goto('/?view=control')

  await expect(page.getByTestId('playlist-item-add-button')).toBeVisible()

  await page.getByTestId('playlist-item-add-button').click()

  await expect(
    page.getByRole('dialog', { name: 'プレイリスト項目を追加' })
  ).toBeVisible()

  await page.getByRole('button', { name: 'ウェブ' }).click()
  await page.getByLabel('URL').fill('https://example.com/signage')
  await page.getByRole('button', { name: '決定' }).click()

  await expect(
    page.getByRole('dialog', { name: 'プレイリスト項目を追加' })
  ).not.toBeVisible()
  await expect(page.getByTestId('playlist-item-timeline')).toBeVisible()
  await expect(page.getByText('example.com/signage')).toBeVisible()
})

test('keeps the playlist list and detail panes side by side at 800px width', async ({
  page
}) => {
  await page.setViewportSize({ width: 800, height: 900 })
  await page.goto('/?view=control')

  const workbench = page.locator('.playlist-workbench')
  const listPane = page.locator('.playlist-pane')
  const detailPane = page.locator('.playlist-detail')

  await expect(workbench).toBeVisible()

  const [gridTemplateColumns, listBox, detailBox] = await Promise.all([
    workbench.evaluate(
      (node) => window.getComputedStyle(node).gridTemplateColumns
    ),
    listPane.boundingBox(),
    detailPane.boundingBox()
  ])

  expect(gridTemplateColumns.split(' ').filter(Boolean)).toHaveLength(2)
  expect(listBox).not.toBeNull()
  expect(detailBox).not.toBeNull()
  expect(Math.abs((listBox?.y ?? 0) - (detailBox?.y ?? 0))).toBeLessThan(8)
  expect((listBox?.x ?? 0) + (listBox?.width ?? 0)).toBeLessThan(
    (detailBox?.x ?? 0) - 8
  )
})

test('edits playlist items through a dialog', async ({ page }) => {
  await page.goto('/?view=control')

  await page.getByTestId('playlist-item-add-button').click()
  await page.getByRole('button', { name: 'ウェブ' }).click()
  await page.getByLabel('URL').fill('https://example.com/signage')
  await page.getByRole('button', { name: '決定' }).click()

  await expect(page.getByText('example.com/signage')).toBeVisible()
  await expect(
    page.locator('.playlist-item').first().getByText('表示時間（秒）')
  ).not.toBeVisible()

  await page.getByRole('button', { name: '項目を編集' }).click()

  const editDialog = page.getByRole('dialog', {
    name: 'プレイリスト項目を編集'
  })
  await expect(editDialog).toBeVisible()
  await expect(editDialog.getByLabel('URL')).toHaveValue(
    'https://example.com/signage'
  )

  await editDialog.getByLabel('URL').fill('https://example.com/updated')
  await editDialog.getByRole('button', { name: '更新' }).click()

  await expect(editDialog).not.toBeVisible()
  await expect(page.getByText('example.com/updated')).toBeVisible()
  await expect(page.getByText('example.com/signage')).not.toBeVisible()
})

test('disables setting an empty playlist as the active target', async ({
  page
}) => {
  await page.goto('/?view=control')

  await page.getByTestId('playlist-add-button').click()

  const setActiveButton = page.getByRole('button', { name: '再生対象にする' })
  await expect(setActiveButton).toBeDisabled()

  await page.getByTestId('playlist-item-add-button').click()
  await page.getByRole('button', { name: 'ウェブ' }).click()
  await page.getByLabel('URL').fill('https://example.com/active-target')
  await page.getByRole('button', { name: '決定' }).click()

  await expect(setActiveButton).toBeEnabled()
})

test('blocks starting when every display is disabled', async ({ page }) => {
  await page.goto('/?view=control')

  await page.locator('.display-summary').first().getByRole('switch').click()
  await page.getByRole('button', { name: '開始' }).click()

  await expect(
    page.getByText('少なくとも一つのDisplayを有効にしてください')
  ).toBeVisible()
})

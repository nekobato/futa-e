import { expect, test } from '@playwright/test'

test('shows per-display editors when individual monitor settings are enabled', async ({
  page
}) => {
  await page.goto('/?view=control')

  await expect(page.getByText('Detected displays: 2')).toBeVisible()

  await page.getByTestId('per-display-controls').getByRole('switch').click()

  await expect(page.getByText('Shared Playlist')).toBeVisible()
  await expect(page.getByTestId('display-card-1')).toBeVisible()
  await expect(page.getByTestId('display-card-2')).toBeVisible()
})

const { test, expect } = require('@playwright/test')
const { ARTICLE, RECIPE, watchErrors, openEdit, signIn } = require('./helpers')

// The edit form, as a visitor sees it: every widget renders from Drupal's
// form display, the media widget shows the photograph the node has, and
// the lists are the recipe's own.
test.describe('edit form', () => {
  test('the article form shows its photograph as the selection', async ({
    page,
  }) => {
    const errors = watchErrors(page)
    await openEdit(page, ARTICLE)
    const image = page.locator('.edit-media img')
    await expect(image).toBeVisible()
    await expect
      .poll(() => image.evaluate((img) => img.naturalWidth))
      .toBeGreaterThan(0)
    await expect(page.locator('.edit-media__name')).not.toBeEmpty()
    expect(errors).toEqual([])
  })

  test('the recipe form lists ingredients and numbered steps', async ({
    page,
  }) => {
    await openEdit(page, RECIPE)
    await expect
      .poll(() => page.locator('.edit-list__input').count())
      .toBeGreaterThan(3)
    await expect
      .poll(() => page.locator('.edit-steps__input').count())
      .toBeGreaterThan(2)
    await expect(page.locator('.edit-list__grip').first()).toBeVisible()
    await expect(page.locator('#title')).toHaveValue(/Crema catalana/)
  })

  // Saving says so: Drupal has it, and the static pages follow once the site
  // has rebuilt. The original title is saved back after.
  test('a save is confirmed, and says when the pages catch up', async ({
    page,
  }) => {
    await signIn(page)
    await openEdit(page, RECIPE)
    const title = page.locator('#title')
    const original = await title.inputValue()
    const save = page.locator('.edit-actions__save')
    const toast = page.locator('.b-toast', { hasText: 'Saved to Drupal' })
    for (const value of [`${original} (saved)`, original]) {
      await title.fill(value)
      await save.click()
      await expect(toast.last()).toBeVisible()
      await expect(toast.last()).toContainText('rebuilds')
      await expect(save).toBeDisabled()
      await page.locator('.b-toast .close').last().click()
      await expect(toast).toHaveCount(0)
    }
  })

  // Beside the frontend's Edit tab, an editor reaches the same node on
  // Drupal's own screens, in the page's language.
  test('an editor has Drupal’s own screens beside the tabs', async ({
    page,
  }) => {
    await page.goto(RECIPE)
    await expect(page.locator('.drupal-links')).toHaveCount(0)
    await signIn(page)
    await page.goto('/es/recipes/crema-catalana')
    await page.locator('.drupal-links__toggle').click()
    const items = page.locator('.drupal-links__item')
    await expect(items).toHaveCount(3)
    await expect(items.first()).toHaveAttribute(
      'href',
      /\/es\/node\/\d+\/edit$/,
    )
    await expect(items.first()).toHaveAttribute('target', '_blank')
    await expect(page.locator('.page-tabs__tab')).toHaveCount(2)
  })

  test('a visitor is asked to sign in rather than shown Save', async ({
    page,
  }) => {
    await openEdit(page, RECIPE)
    await expect(page.locator('.edit-actions__signin')).toBeVisible()
    await expect(page.locator('.edit-actions__save')).toHaveCount(0)
  })
})

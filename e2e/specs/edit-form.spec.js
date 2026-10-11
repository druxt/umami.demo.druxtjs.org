const { test, expect } = require('@playwright/test')
const { ARTICLE, RECIPE, watchErrors, openEdit } = require('./helpers')

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

  test('a visitor is asked to sign in rather than shown Save', async ({
    page,
  }) => {
    await openEdit(page, RECIPE)
    await expect(page.locator('.edit-actions__signin')).toBeVisible()
    await expect(page.locator('.edit-actions__save')).toHaveCount(0)
  })
})

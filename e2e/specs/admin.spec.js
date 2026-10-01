const { test, expect } = require('@playwright/test')
const { visit } = require('./helpers')

// Drupal's admin paths are not content: the site hands the visitor through
// to the same path on the backend.
test.describe('admin', () => {
  test('an admin path opens the same path in Drupal', async ({ page }) => {
    await visit(page, '/admin/content')
    const admin = page.locator('.admin-page')
    await expect(admin).toBeVisible()
    await expect(admin).toContainText('lives in Drupal')
    const href = await admin.locator('.admin-page__open').getAttribute('href')
    expect(href).toMatch(/\/admin\/content$/)
    expect(href.startsWith(new URL(page.url()).origin)).toBe(false)
  })

  test('a content path that starts like an admin one stays content', async ({
    page,
  }) => {
    await visit(page, '/node/add/recipe')
    await expect(page.locator('.admin-page__open')).toHaveAttribute(
      'href',
      /\/node\/add\/recipe$/
    )
    await visit(page, '/en/recipes')
    await expect(page.locator('.admin-page')).toHaveCount(0)
  })
})

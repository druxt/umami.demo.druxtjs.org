const { test, expect } = require('@playwright/test')
const { visit } = require('./helpers')

// While the demo reinstalls (a deploy, or the reset control) Drupal answers
// 503 behind the frontend for about two minutes. A visitor who moves to a
// page in that window gets told so, and the page comes back by itself.
test.describe('resilience', () => {
  test('a page asked for while Drupal reinstalls waits, then loads', async ({
    page,
  }) => {
    await visit(page, '/en')
    // Drupal goes away: the router's path lookup answers 503.
    let away = true
    await page.route('**/router/translate-path**', (route) =>
      away
        ? route.fulfill({ status: 503, body: 'provisioning' })
        : route.continue()
    )
    await page.route('**/jsonapi', (route) =>
      away
        ? route.fulfill({ status: 503, body: 'provisioning' })
        : route.continue()
    )
    await page
      .locator('a[href="/en/recipes/super-easy-vegetarian-pasta-bake"]')
      .first()
      .click()
    const errorPage = page.locator('.error-page')
    await expect(errorPage).toBeVisible()
    await expect(errorPage).toContainText('being reset')
    await expect(errorPage.locator('.error-page__status')).toBeVisible()

    // Drupal is back: the page reloads itself and shows the recipe.
    away = false
    await expect(page.locator('h1').first()).toContainText(
      'Super easy vegetarian pasta bake',
      { timeout: 20000 }
    )
  })

  test('an unknown path is a plain not-found page', async ({ page }) => {
    await visit(page, '/en/nothing-here')
    const errorPage = page.locator('.error-page')
    await expect(errorPage).toBeVisible()
    await expect(errorPage).toContainText('There is no page here')
    await expect(errorPage.locator('a.error-page__home')).toHaveAttribute(
      'href',
      '/en'
    )
  })
})

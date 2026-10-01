const { test, expect } = require('@playwright/test')
const { visit } = require('./helpers')

// A Spanish page is Spanish all the way down: Drupal's content, the views
// (which the JSON:API index does not list, so their URLs once lost the
// language prefix), the menus, and the frontend's own words.
test.describe('languages', () => {
  test('the Spanish home lists collections and menus in Spanish', async ({
    page,
  }) => {
    await visit(page, '/es/node')
    await expect(
      page.locator('.collections h2', { hasText: 'Colecciones' }),
    ).toBeVisible()
    await expect(
      page.locator('a', { hasText: 'Sin alcohol' }).first(),
    ).toBeVisible()
    await expect(page.locator('a', { hasText: 'Alcohol free' })).toHaveCount(0)
    const footer = page.locator('.site-footer')
    await expect(footer).toContainText('Recetas')
    await expect(footer).not.toContainText('Recipes')
  })

  test('the Spanish home banner speaks Spanish', async ({ page }) => {
    await visit(page, '/es/node')
    const banner = page.locator('.banner')
    await expect(banner.locator('.banner__kicker')).toHaveText(
      'Receta de la semana',
    )
    // The button carries the banner's title, so its text names where it goes.
    const title = (await banner.locator('.banner__title').textContent()).trim()
    await expect(banner.locator('a.btn')).toContainText(title)
  })

  test('switching to Spanish in the browser fetches Spanish views', async ({
    page,
  }) => {
    // A client-side fetch has no server base URL: the view's request must
    // still carry the language prefix as an absolute path.
    await visit(page, '/en')
    // The switch is in the masthead from md up and in the drawer on a phone.
    const masthead = page.locator('.masthead__lang a', { hasText: 'ES' })
    if (await masthead.first().isVisible()) {
      await masthead.first().click()
    } else {
      await page.click('button[aria-label="Open menu"]')
      await page.locator('.drawer__lang-btn', { hasText: 'ES' }).click()
    }
    await page.waitForURL(/\/es/)
    // The views refetch after the switch; give the collections their time.
    await expect(
      page.locator('a', { hasText: 'Sin alcohol' }).first(),
    ).toBeVisible({ timeout: 15000 })
    // The banner's block content follows its translation too.
    await expect(page.locator('.banner__title')).toHaveText(
      'Pasta vegetariana horneada súper fácil',
    )
  })

  test('the language switch on a recipe leads to its translation', async ({
    page,
  }) => {
    // Each translation has an alias of its own: a prefix swap on the
    // English alias is a path Drupal cannot resolve.
    await visit(page, '/en/recipes/gluten-free-pizza')
    const masthead = page.locator('.masthead__lang a', { hasText: 'ES' })
    let link = masthead.first()
    if (!(await link.isVisible())) {
      await page.click('button[aria-label="Open menu"]')
      link = page.locator('.drawer__lang-btn', { hasText: 'ES' })
    }
    await expect(link).toHaveAttribute('href', '/es/recipes/pizza-sin-gluten')
    await link.click()
    await page.waitForURL(/\/es\/recipes\/pizza-sin-gluten$/)
    await expect(page.locator('h1').first()).toContainText('Pizza sin gluten')
    await expect(page.locator('h1', { hasText: '404' })).toHaveCount(0)
  })

  test('the English home stays English', async ({ page }) => {
    await visit(page, '/en')
    await expect(
      page.locator('a', { hasText: 'Alcohol free' }).first(),
    ).toBeVisible()
    await expect(page.locator('.site-footer')).toContainText('Recipes')
  })
})

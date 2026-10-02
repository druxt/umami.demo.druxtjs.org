const { test, expect } = require('@playwright/test')

// A path with no page is a 404, so a dead link or a stale redirect shows up
// as one, while the app still renders its not-found page there.
test.describe('not found', () => {
  test('a path with no page answers 404 and says so', async ({ page }) => {
    const response = await page.goto('/en/recipes/no-such-recipe')
    expect(response.status()).toBe(404)
    await expect(page.locator('.error-page__title')).toBeVisible()
  })

  test('a real page still answers 200', async ({ request }) => {
    for (const path of ['/en', '/es/recipes', '/en/about-umami', '/login']) {
      expect((await request.get(path)).status(), path).toBe(200)
    }
  })
})

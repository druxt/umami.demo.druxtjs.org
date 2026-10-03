const { test, expect } = require('@playwright/test')
const { visit } = require('./helpers')

// A link opens its page at the top, however far down the last one was read.
test.describe('navigation', () => {
  const scrollY = (page) => () => page.evaluate(() => window.scrollY)

  test('a card opens its page at the top', async ({ page }) => {
    await visit(page, '/en')
    await page.evaluate(() => window.scrollTo(0, 3000))
    await expect.poll(scrollY(page)).toBeGreaterThan(0)
    await page.locator('a[href^="/en/recipes/"]').first().click()
    await page.waitForURL(/\/en\/recipes\/./)
    await expect.poll(scrollY(page)).toBe(0)
  })

  test('a page opened from the phone menu starts at the top', async ({
    page,
  }) => {
    await visit(page, '/en')
    const menu = page.locator('button[aria-label="Open menu"]')
    test.skip(!(await menu.isVisible()), 'the drawer is a phone control')
    await page.evaluate(() => window.scrollTo(0, 3000))
    await expect.poll(scrollY(page)).toBeGreaterThan(0)
    // The drawer holds the page still while it is open and puts the reader
    // back on close: a new page must not inherit the old position.
    await menu.click()
    await page.locator('.drawer__link', { hasText: 'Recipes' }).click()
    await page.waitForURL(/\/en\/recipes$/)
    await expect.poll(scrollY(page)).toBe(0)
  })
})

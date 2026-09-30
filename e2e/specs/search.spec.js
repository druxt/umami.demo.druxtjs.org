const { test, expect } = require('@playwright/test')
const { visit } = require('./helpers')

// Search runs on a Lunr index built into the site. The index has to be in
// the build and be JSON; a page served in its place is a search that finds
// nothing, and once was.
test.describe('search', () => {
  test('the index is in the build', async ({ request }) => {
    const response = await request.get('/_nuxt/search-index/en.json')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('json')
    const body = await response.text()
    expect(body).toContain('brownie')
  })

  test('typing finds recipes with the server switched off', async ({
    page,
  }) => {
    await visit(page, '/en')
    // Below lg the icon opens the drawer's field; at lg the pill opens the
    // search panel. One search bar is visible either way.
    const icon = page.locator('.masthead__search-icon')
    if (await icon.isVisible()) await icon.click()
    else await page.locator('.masthead__search').click()
    const bar = page.locator('.searchbar:visible').first()
    await bar.locator('input').fill('chili')
    const results = bar.locator('.searchbar__results a')
    await expect(results.first()).toBeVisible()
    await expect(results.first()).toContainText(/chili/i)
  })
})

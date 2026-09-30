const { test, expect } = require('@playwright/test')
const { visit } = require('./helpers')

// Search runs on a Lunr index built into the site. The index has to be in
// the build and be JSON; a page served in its place is a search that finds
// nothing, and once was.
test.describe('search', () => {
  test('typing finds recipes with the server switched off', async ({
    page,
  }) => {
    // The index request must come back as JSON: a page in its place is a
    // parse error and no results, which is how it once failed.
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    let index = null
    page.on('response', (response) => {
      if (/\/_nuxt\/search-index[^/]*\/\w+\.json$/.test(response.url())) {
        index = response
      }
    })
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
    expect(index && index.status()).toBe(200)
    expect(index.headers()['content-type']).toContain('json')
    expect(errors).toEqual([])
  })
})

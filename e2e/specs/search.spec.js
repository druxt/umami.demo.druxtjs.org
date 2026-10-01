const { test, expect } = require('@playwright/test')
const { openSearch, visit } = require('./helpers')

/** Open whichever search control the viewport shows: the icon opens the
 * drawer's field below lg, the pill opens the panel at lg. */
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
    await openSearch(page)
    const bar = page.locator('.searchbar:visible').first()
    // The field has the cursor as soon as the panel is open.
    await expect(bar.locator('input')).toBeFocused()
    await bar.locator('input').fill('chili')
    const results = bar.locator('.searchbar__results a')
    await expect(results.first()).toBeVisible()
    await expect(results.first()).toContainText(/chili/i)
    // The panel's teaser once collapsed to nothing: the row was there and
    // its text was in the DOM, but the card had no size.
    const box = await results.first().boundingBox()
    expect(box.height).toBeGreaterThan(40)
    expect(index && index.status()).toBe(200)
    expect(index.headers()['content-type']).toContain('json')
    expect(errors).toEqual([])
  })

  test('a Spanish page searches Spanish content only', async ({ page }) => {
    await visit(page, '/es')
    await openSearch(page)
    const bar = page.locator('.searchbar:visible').first()
    await bar.locator('input').fill('zanahorias')
    const results = bar.locator('.searchbar__results a')
    await expect(results.first()).toBeVisible()
    const hrefs = await results.evaluateAll((links) =>
      links.map((a) => a.getAttribute('href')),
    )
    expect(hrefs.every((href) => href.startsWith('/es/'))).toBe(true)

    // And the English page does not find the Spanish title.
    await visit(page, '/en')
    await openSearch(page)
    const english = page.locator('.searchbar:visible').first()
    await english.locator('input').fill('zanahorias')
    await expect(english.locator('.searchbar__results a')).toHaveCount(0)
  })
})

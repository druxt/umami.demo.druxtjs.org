const { test, expect } = require('@playwright/test')
const { openSearch, visit } = require('./helpers')

// cspell:ignore mocktails tomatos

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

  // What a reader types is rarely the exact word in the text: a tag, the
  // start of a word, a slip of one letter.
  test('a tag, the start of a word and a near miss all find content', async ({
    page,
  }) => {
    await visit(page, '/en')
    await openSearch(page)
    const bar = page.locator('.searchbar:visible').first()
    const input = bar.locator('input')
    const results = bar.locator('.searchbar__results a')
    for (const [query, expected] of [
      ['drink', /mocktails/i],
      ['choc', /chocolate/i],
      ['tomatos', /.+/],
    ]) {
      await input.fill(query)
      await expect(results.first(), query).toBeVisible()
      await expect(results.filter({ hasText: expected }).first()).toBeVisible()
    }
    // Lunr's own syntax is not the reader's: a stray colon is just text.
    await input.fill('title:')
    await expect(bar.locator('.searchbar__meta')).toBeVisible()
  })

  test('the suggestion fills the field and finds plenty', async ({ page }) => {
    await visit(page, '/en')
    await openSearch(page)
    const bar = page.locator('.searchbar:visible').first()
    await bar.locator('.searchbar__example').click()
    await expect(bar.locator('input')).toHaveValue('sugar')
    await expect
      .poll(() => bar.locator('.searchbar__results a').count())
      .toBeGreaterThanOrEqual(8)
  })

  // The panel is a layout component: closing hides it, it is not torn down,
  // so it opens again as it was left, scrolled down the results included.
  test('closing and reopening keeps the query, results and scroll', async ({
    page,
  }) => {
    await visit(page, '/en')
    await openSearch(page)
    let bar = page.locator('.searchbar:visible').first()
    await bar.locator('input').fill('sugar')
    await expect(bar.locator('.searchbar__results a').nth(5)).toBeVisible()
    const body = page.locator('.searchbar:visible .searchbar__results')
    await body.evaluate((el) => el.scrollTo(0, 200))
    const scrolled = await body.evaluate((el) => el.scrollTop)
    // The browser reports a scroll on its next frame, as it would a reader's.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    )
    expect(scrolled).toBeGreaterThan(50)
    await page.keyboard.press('Escape')
    await expect(page.locator('.searchbar:visible')).toHaveCount(0)
    await openSearch(page)
    bar = page.locator('.searchbar:visible').first()
    await expect(bar.locator('input')).toHaveValue('sugar')
    await expect(bar.locator('.searchbar__results a').first()).toBeAttached()
    await expect
      .poll(() =>
        page
          .locator('.searchbar:visible .searchbar__results')
          .evaluate((el) => el.scrollTop),
      )
      .toBe(scrolled)
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

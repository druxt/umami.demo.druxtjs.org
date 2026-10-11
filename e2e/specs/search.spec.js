const { test, expect } = require('@playwright/test')
const { openSearch, visit } = require('./helpers')

// cspell:ignore garlik

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
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error)))
    await visit(page, '/en')
    await openSearch(page)
    const bar = page.locator('.searchbar:visible').first()
    const input = bar.locator('input')
    const results = bar.locator('.searchbar__results a')
    for (const [query, expected] of [
      ['drink', /mocktails/i],
      ['choc', /chocolate/i],
      // One letter out, and no stem or prefix that would find it anyway.
      ['garlik', /.+/],
    ]) {
      await input.fill(query)
      await expect(results.first(), query).toBeVisible()
      await expect(results.filter({ hasText: expected }).first()).toBeVisible()
    }
    // Lunr's own syntax is not the reader's: a stray colon is just text,
    // searched as such, and nothing throws.
    await input.fill('title:')
    await expect(bar.locator('.searchbar__meta')).toContainText(
      /result|Nothing/
    )
    expect(errors).toEqual([])
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
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        )
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
          .evaluate((el) => el.scrollTop)
      )
      .toBe(scrolled)
  })

  // Facets narrow the results to a type, a category or a tag, and say how
  // many of each there are.
  test('a facet narrows the results and gives them back', async ({ page }) => {
    await visit(page, '/en')
    await openSearch(page)
    const bar = page.locator('.searchbar:visible').first()
    await bar.locator('input').fill('sugar')
    const results = bar.locator('.searchbar__results a')
    await expect.poll(() => results.count()).toBeGreaterThanOrEqual(8)
    const all = await results.count()
    // Facets are named for readers: a category or a tag by its name, never
    // the term ID an index can hold in its place.
    const labels = await bar
      .locator('.searchbar__chip')
      .evaluateAll((chips) => chips.map((c) => c.firstChild.textContent.trim()))
    expect(labels.filter((label) => /^\d+$/.test(label))).toEqual([])
    if (!(await page.locator('button[aria-label="Open menu"]').isVisible())) {
      await expect(
        bar.locator('.searchbar__chip', { hasText: 'Desserts' })
      ).toBeVisible()
      await expect(
        bar.locator('.searchbar__chip', { hasText: 'Vegetarian' })
      ).toBeVisible()
    }
    const article = bar.locator('.searchbar__chip', { hasText: 'Article' })
    const count = Number(await article.locator('.searchbar__count').innerText())
    await article.click()
    await expect(article).toHaveAttribute('aria-pressed', 'true')
    await expect(results).toHaveCount(count)
    const hrefs = await results.evaluateAll((links) =>
      links.map((a) => a.getAttribute('href'))
    )
    expect(hrefs.every((href) => href.includes('/articles/'))).toBe(true)
    await article.click()
    await expect(results).toHaveCount(all)
  })

  // Every count is what choosing it would show under the other facets'
  // choices, so a chip never promises results the list then does not have.
  test('facet counts follow the other chosen facets', async ({ page }) => {
    await visit(page, '/en')
    test.skip(
      await page.locator('button[aria-label="Open menu"]').isVisible(),
      'the phone drawer shows the type facet only'
    )
    await openSearch(page)
    const bar = page.locator('.searchbar:visible').first()
    await bar.locator('input').fill('sugar')
    const results = bar.locator('.searchbar__results a')
    await expect.poll(() => results.count()).toBeGreaterThanOrEqual(8)
    await bar.locator('.searchbar__chip', { hasText: 'Recipe' }).click()

    // Labels first: choosing one chip rightly disables others, so a live
    // list of the enabled ones would shift under the loop.
    const labels = await bar
      .locator(
        '.searchbar__facet:not(:first-child) .searchbar__chip:not([disabled])'
      )
      .evaluateAll((chips) => chips.map((c) => c.firstChild.textContent.trim()))
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      const chip = bar
        .locator('.searchbar__facet:not(:first-child) .searchbar__chip')
        .filter({ hasText: new RegExp(`^\\s*${label}\\s+\\d+\\s*$`) })
      const count = Number(await chip.locator('.searchbar__count').innerText())
      expect(count).toBeGreaterThan(0)
      await chip.click()
      await expect(results).toHaveCount(count)
      await chip.click()
      await expect(chip).toHaveAttribute('aria-pressed', 'false')
    }
    // A chip that would show nothing says 0 and is not a choice.
    const empty = bar.locator('.searchbar__chip[disabled]')
    for (const label of await empty
      .locator('.searchbar__count')
      .allInnerTexts()) {
      expect(label).toBe('0')
    }
  })

  test('in the phone drawer the results end above the menu', async ({
    page,
  }) => {
    await visit(page, '/en')
    const menu = page.locator('button[aria-label="Open menu"]')
    test.skip(!(await menu.isVisible()), 'the drawer is the phone layout')
    await openSearch(page)
    await page.locator('.searchbar:visible input').fill('sugar')
    await expect(page.locator('.searchbar__chip:visible').first()).toBeVisible()
    const [list, nav] = await Promise.all([
      page.locator('.drawer__search').boundingBox(),
      page.locator('.drawer__menu').boundingBox(),
    ])
    expect(list.y + list.height).toBeLessThanOrEqual(nav.y + 1)
    const results = await page
      .locator('.searchbar:visible .searchbar__results')
      .boundingBox()
    expect(results.y + results.height).toBeLessThanOrEqual(nav.y + 1)
  })

  test('a Spanish page searches Spanish content only', async ({ page }) => {
    await visit(page, '/es')
    await openSearch(page)
    const bar = page.locator('.searchbar:visible').first()
    await bar.locator('input').fill('zanahorias')
    const results = bar.locator('.searchbar__results a')
    await expect(results.first()).toBeVisible()
    const hrefs = await results.evaluateAll((links) =>
      links.map((a) => a.getAttribute('href'))
    )
    expect(hrefs.every((href) => href.startsWith('/es/'))).toBe(true)

    // And the English page does not find the Spanish title.
    await visit(page, '/en')
    await openSearch(page)
    const english = page.locator('.searchbar:visible').first()
    await english.locator('input').fill('zanahorias')
    // Searched, not merely not yet: the status says so before the count.
    await expect(english.locator('.searchbar__meta')).toContainText(
      'Nothing found'
    )
    await expect(english.locator('.searchbar__results a')).toHaveCount(0)
  })
})

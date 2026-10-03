const { test, expect } = require('@playwright/test')
const { visit } = require('./helpers')

// A link opens its page at the top, however far down the last one was read.
test.describe('navigation', () => {
  // The front page is /en; the server answers the bare root with a redirect
  // rather than a page that paints nothing, on every environment.
  test('the root is a redirect to the English home', async ({
    page,
    baseURL,
  }) => {
    const response = await page.request.get(`${baseURL}/`, { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(response.headers().location).toBe('/en')
  })

  test('the main menu keeps space between its links', async ({ page }) => {
    await visit(page, '/en')
    const links = page.locator('.masthead .navbar-nav .nav-link:visible')
    test.skip((await links.count()) < 2, 'the drawer holds the menu here')
    // The words, not the boxes: a link's padding is what spaces them.
    const boxes = await links.evaluateAll((els) =>
      els.map((el) => {
        const range = document.createRange()
        range.selectNodeContents(el)
        return range.getBoundingClientRect().toJSON()
      }),
    )
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].left - boxes[i - 1].right).toBeGreaterThanOrEqual(8)
    }
  })

  // One left edge on every page: the container's, where the title band,
  // the reading column, the forms and the article's rail all start.
  for (const path of [
    '/en/about-umami',
    '/en/contact',
    '/login',
    '/en/recipes/crema-catalana',
    '/en/articles/give-your-oatmeal-the-ultimate-makeover',
    '/en/tags/vegan',
  ]) {
    test(`${path} starts its content at the container edge`, async ({
      page,
    }) => {
      await visit(page, path)
      const edges = await page.evaluate(() => {
        const box = (el) => el && Math.round(el.getBoundingClientRect().left)
        const container = document.querySelector('.band--paper > .container')
        const style = getComputedStyle(container)
        const edge =
          box(container) +
          parseFloat(style.paddingLeft) +
          parseFloat(style.borderLeftWidth)
        const parts = [
          'h1',
          '.page-node__measure',
          '.form-page',
          '.auth',
          '.article-page__rail',
        ]
          .map((s) => [...document.querySelectorAll(s)])
          .flat()
          // An article's title sits beside its rail, when the rail shows.
          .filter(
            (el) =>
              !el.matches('.article-page__title') ||
              !document.querySelector('.article-page__rail').offsetWidth,
          )
          .filter((el) => el.getBoundingClientRect().width > 0)
          .map((el) => [el.className || el.tagName, box(el)])
        return { edge: Math.round(edge), parts }
      })
      expect(edges.parts.length).toBeGreaterThan(0)
      for (const [name, left] of edges.parts) {
        expect(left, name).toBe(edges.edge)
      }
    })
  }

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

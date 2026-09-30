const { test, expect } = require('@playwright/test')
const { RECIPE, visit } = require('./helpers')

// The learning layer on a recipe: the view-mode switcher and the JSON:API
// drawer. Opening the drawer must not widen the page past the viewport.
test.describe('learning layer', () => {
  test('the JSON:API drawer opens without widening the page', async ({
    page,
  }) => {
    await visit(page, RECIPE)
    const fits = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      )
    expect(await fits()).toBe(true)
    await page.locator('.jsonapi-drawer__toggle').click()
    await expect(page.locator('.jsonapi-drawer__tree')).toBeVisible()
    expect(await fits()).toBe(true)
  })

  test('the Storybook link points at this site’s own Storybook', async ({
    page,
    baseURL,
  }) => {
    await visit(page, RECIPE)
    const href = await page
      .locator('a[href*="/?path=/story/"]')
      .first()
      .getAttribute('href')
    // The rule in nuxt/utils/storybook.js: a Lagoon environment's own
    // Storybook, the local one on a laptop, production's otherwise.
    const host = new URL(baseURL).host
    if (host.startsWith('app.')) {
      expect(href).toContain(`https://storybook.${host.slice(4)}`)
    } else if (/^(localhost|127\.0\.0\.1)(:|$)/.test(host)) {
      expect(href).toContain('http://localhost:3003')
    } else {
      expect(href).toContain('https://storybook.umami.demo.druxtjs.org')
    }
    expect(href).toMatch(/\?path=\/story\//)
  })
})

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

  // A view mode switch swaps the preview without collapsing it first, so the
  // page below holds still.
  test('switching view mode does not collapse the preview', async ({
    page,
  }) => {
    await visit(page, RECIPE)
    const stage = page.locator('.view-modes__stage')
    await expect(stage.locator('.recipe-card, .teaser').first()).toBeVisible()
    const before = (await stage.boundingBox()).height
    await page.locator('.view-modes button', { hasText: 'teaser' }).click()
    const heights = []
    for (let i = 0; i < 15; i++) {
      heights.push((await stage.boundingBox()).height)
      await page.waitForTimeout(40)
    }
    await expect(stage.locator('.teaser').first()).toBeVisible()
    const after = (await stage.boundingBox()).height
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(
      Math.min(before, after) * 0.9,
    )
  })

  test('the code sample in a note is not clipped', async ({ page }) => {
    await visit(page, RECIPE)
    const sample = page.locator('.druxt-note .druxt-code').first()
    await expect(sample).toBeVisible()
    const [scroll, client] = await sample.evaluate((el) => [
      el.scrollWidth,
      el.clientWidth,
    ])
    expect(scroll).toBeLessThanOrEqual(client)
  })

  test('the explorer opens the story of the display it previews', async ({
    page,
  }) => {
    await visit(page, '/entity-explorer')
    await expect(page.locator('.explorer__storybook')).toHaveAttribute(
      'href',
      /\/\?path=\/story\/druxt-entity-node-recipe-view-displays--card$/,
    )
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

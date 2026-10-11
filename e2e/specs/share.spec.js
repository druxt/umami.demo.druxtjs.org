const { test, expect } = require('@playwright/test')
const { visit } = require('./helpers')

// The demo's own links (its repository, the Druxt docs, Discord, the
// quickstart) are one config page in Drupal, read at build. Every place the
// site shows them must show what Drupal holds, not a copy of its own.
test.describe('share links', () => {
  let demo

  test.beforeAll(async ({ request }) => {
    const response = await request.get('/en/jsonapi/config_pages/druxt_demo', {
      headers: { Accept: 'application/vnd.api+json' },
    })
    expect(response.status()).toBe(200)
    const { data } = await response.json()
    expect(data).toHaveLength(1)
    demo = data[0].attributes
  })

  test('the demo bar, footer, drawer and call to action link where Drupal says', async ({
    page,
  }) => {
    await visit(page, '/en')
    const hrefs = async (selector) =>
      page
        .locator(selector)
        .evaluateAll((links) => links.map((a) => a.getAttribute('href')))

    // The demo bar's source link, the footer's Druxt links and the call to
    // action all carry the config page's addresses.
    expect(await hrefs('.demo-bar a')).toEqual(
      expect.arrayContaining([
        demo.field_site_source.uri,
        demo.field_druxt_docs.uri,
        demo.field_discord.uri,
      ]),
    )
    expect(await hrefs('.site-footer a')).toEqual(
      expect.arrayContaining([
        demo.field_site_source.uri,
        demo.field_discord.uri,
      ]),
    )
    expect(await hrefs('.druxt-cta a')).toEqual(
      expect.arrayContaining([
        demo.field_devpod.uri,
        demo.field_site_source.uri,
      ]),
    )
    await expect(page.locator('.druxt-cta__command')).toContainText(
      demo.field_quickstart,
    )
    expect(
      await page
        .locator('head meta[name="twitter:site"]')
        .getAttribute('content'),
    ).toBe(demo.field_twitter)
  })

  test('the About page lists the resources Drupal names', async ({ page }) => {
    await visit(page, '/en/about-umami')
    const cards = page.locator('.about-resources__card')
    await expect(cards.first()).toBeVisible()
    const hrefs = await cards.evaluateAll((links) =>
      links.map((a) => a.getAttribute('href')),
    )
    expect(hrefs).toEqual([
      demo.field_druxt_docs.uri,
      demo.field_druxt_source.uri,
      demo.field_druxt_module.uri,
      demo.field_discord.uri,
      demo.field_site_source.uri,
    ])
  })
})

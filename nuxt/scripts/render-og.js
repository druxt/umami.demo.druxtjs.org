/**
 * Renders the share card, static/og/site.png, from scripts/og-card.html at
 * 1200 by 630: `node scripts/render-og.js`, with the browser tests installed.
 */
const path = require('path')

const here = __dirname
// Playwright lives with the browser tests, not in the app's dependencies.
const { chromium } = require(require.resolve('@playwright/test', {
  paths: [path.join(here, '..', '..', 'e2e')],
}))
const out = path.join(here, '..', 'static', 'og', 'site.png')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  })
  await page.goto(`file://${path.join(here, 'og-card.html')}`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: out, type: 'png' })
  await browser.close()
  // eslint-disable-next-line no-console
  console.log(`wrote ${out}`)
})()

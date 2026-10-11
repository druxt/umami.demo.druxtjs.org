/**
 * Renders the Umami Go share card, static/og/umami-go.png, at 1200 by 630
 * from a running site's /play page, so the card shows the hero's own lattice
 * and its fan of cards: `node scripts/render-og-umami-go.js [site]`, with the
 * browser tests installed. The site defaults to the live demo.
 */
const path = require('path')

const here = __dirname
// Playwright lives with the browser tests, not in the app's dependencies.
const { chromium } = require(require.resolve('@playwright/test', {
  paths: [path.join(here, '..', '..', 'e2e')],
}))
const site = (process.argv[2] || 'https://umami.demo.druxtjs.org').replace(
  /\/$/,
  ''
)
const out = path.join(here, '..', 'static', 'og', 'umami-go.png')

const mark = `<svg viewBox="0 0 452 342" aria-hidden="true"><path fill="#3498DB" d="M139 330l-1-2c-2-4-2-8-1-13H29L189 31l67 121 22-16-67-121c-1-2-9-14-22-14-6 0-15 2-22 15L5 303c-1 3-8 16-2 27 4 6 10 12 24 12h136c-14 0-21-6-24-12z"/><path fill="#108775" d="M447 304L317 70c-2-2-9-15-22-15-6 0-15 3-22 15l-17 28v54l39-67 129 230h-49a23 23 0 0 1-2 14l-1 1c-6 11-21 12-23 12h76c3 0 17-1 24-12 3-5 5-14-2-26z"/><path fill="#E5ECF1" d="M376 330v-1l1-2c1-4 2-8 1-12l-4-12-102-178-15-27h-1l-15 27-102 178-4 12a24 24 0 0 0 2 15c4 6 10 12 24 12h190c3 0 18-1 25-12zM256 152l93 163H163l93-163z"/></svg>`

const style = `
  body > *:not(.og) { display: none !important; }
  html, body { margin: 0; overflow: hidden; }
  .og {
    position: fixed; inset: 0; width: 1200px; height: 630px; overflow: hidden;
    color: #fdfbf7; font-family: Archivo, sans-serif;
  }
  .og__rule { position: absolute; top: 0; left: 0; right: 0; height: 14px; background: #2b3a4a; }
  .og__kicker {
    position: absolute; left: 96px; top: 152px; color: #e8b98f;
    font-size: 17px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
  }
  .og__title {
    position: absolute; left: 92px; top: 188px; margin: 0;
    font-family: Newsreader, serif; font-size: 112px; font-style: italic;
    font-weight: 400; letter-spacing: -0.005em; line-height: 1.05;
  }
  .og__lede { position: absolute; left: 96px; top: 344px; width: 470px; font-size: 22px; line-height: 1.5; }
  .og__fan.go-hero__fan {
    position: absolute; left: 676px; top: 132px; margin: 0;
    transform: scale(1.08); transform-origin: 50% 0;
  }
  .og__fan .go-hero__fan-card { display: block !important; }
  .og__foot {
    position: absolute; left: 96px; right: 96px; bottom: 56px; padding-top: 28px;
    display: flex; align-items: center; justify-content: space-between;
    border-top: 1px solid rgba(232, 185, 143, 0.3);
  }
  .og__built { display: flex; align-items: center; gap: 14px; font-size: 24px; font-weight: 600; }
  .og__built svg { height: 30px; width: auto; }
  .og__url { color: #d9cbb8; font-size: 22px; }
`

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  await page.goto(`${site}/play`, { waitUntil: 'load' })
  // The fan's photographs, loaded before the card is composed.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.go-hero__fan img')].every(
      (img) => img.complete && img.naturalWidth > 0
    )
  )
  await page.evaluate(
    ({ mark, host }) => {
      const hero = document.querySelector('.go-hero')
      const fan = document.querySelector('.go-hero__fan')
      const card = document.createElement('div')
      card.className = 'og'
      // The hero's own night lattice, as the site draws it.
      const bg = getComputedStyle(hero)
      card.style.backgroundImage = bg.backgroundImage
      card.style.backgroundColor = bg.backgroundColor
      card.innerHTML = `<div class="og__rule"></div>
        <div class="og__kicker">A card game from the Umami kitchen</div>
        <h1 class="og__title">Umami Go</h1>
        <p class="og__lede">Two to five players draft the magazine's own recipes into the best meal at the table.</p>
        <div class="og__foot">
          <div class="og__built">${mark}Built with DruxtJS</div>
          <div class="og__url">${host}/play</div>
        </div>`
      fan.classList.add('og__fan')
      card.appendChild(fan)
      document.body.appendChild(card)
    },
    { mark, host: new URL(site).host }
  )
  await page.addStyleTag({ content: style })
  await page.setViewportSize({ width: 1200, height: 630 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  await page.screenshot({ path: out, type: 'png' })
  await browser.close()
  // eslint-disable-next-line no-console
  console.log(`wrote ${out}`)
})()

const { test, expect } = require('@playwright/test')
const { visit, watchErrors } = require('./helpers')

// Umami Go: two browsers at one table. Runs once, on desktop: each test
// drives two pages, and the server's tables are shared state.
test.describe('Umami Go', () => {
  test.describe.configure({ mode: 'serial' })
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'two browsers, once')
  })

  test('the front door explains the game and its eight kinds', async ({
    page,
  }) => {
    const errors = watchErrors(page)
    await visit(page, '/play')
    await expect(page.locator('.go-hero__title')).toHaveText('Umami Go')
    await expect(page.locator('.go-kinds__item')).toHaveCount(8)
    await expect(
      page.getByRole('button', { name: 'Start a table' })
    ).toBeEnabled()
    expect(errors).toEqual([])
    // Shared, the page previews with the game's own card.
    const meta = (key) =>
      page.locator(`meta[property="${key}"]`).getAttribute('content')
    expect(await meta('og:image')).toMatch(/\/og\/umami-go\.png$/)
    expect(await meta('og:image:width')).toBe('1200')
    const graphs = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents()
    expect(graphs.some((g) => JSON.parse(g)['@type'] === 'Game')).toBe(true)
  })

  test("a table's address is a page that previews as an invitation", async ({
    request,
  }) => {
    const response = await request.get('/play/K7QF')
    expect(response.status()).toBe(200)
    // A link shared in a chat previews as an invitation to that table.
    const html = await response.text()
    expect(html).toContain('<title>Umami Go: join table K7QF</title>')
    expect(html).toMatch(
      /property="og:image" content="[^"]*\/og\/umami-go\.png"/
    )
    expect(html).toContain('<meta name="robots" content="noindex">')
  })

  test('two players set a table, deal, and play a turn', async ({
    browser,
  }) => {
    const host = await (await browser.newContext()).newPage()
    const guest = await (await browser.newContext()).newPage()
    await visit(host, '/play')
    await host.getByRole('button', { name: 'Start a table' }).click()
    await host.waitForURL(/\/play\/[A-Z0-9]{4}$/)
    // The lobby's QR code is of the table's own address.
    await expect(host.locator('.go-lobby__qr svg')).toBeVisible()
    const code = host.url().split('/').pop()
    await expect(host.locator('.go-lobby__code')).toHaveText(code)
    await expect(host.locator('.go-bar__code')).toHaveText(code)

    // The guest joins with the code from the front door.
    await visit(guest, '/play')
    await guest.locator('#go-code').fill(code.toLowerCase())
    await guest.getByRole('button', { name: 'Join' }).click()
    await expect(
      host.locator('.go-lobby__player:not(.go-lobby__player--empty)')
    ).toHaveCount(2)
    await expect(guest.locator('.go-lobby__waiting')).toContainText('to deal')

    await host.getByRole('button', { name: 'Deal · 2 players' }).click()
    const hand = (page) => page.locator('.go-hand__card')
    await expect(hand(host)).toHaveCount(10)
    await expect(hand(guest)).toHaveCount(10)
    await expect(host.locator('.go-bar__turn')).toHaveText(
      'Round 1 of 3 · turn 1'
    )

    // A choice is not a pick until it is locked in.
    const lock = (page) => page.locator('.go-lock')
    await expect(lock(host)).toBeDisabled()
    await hand(host).nth(1).click()
    await expect(lock(host)).toHaveText(/^Lock in /)
    await expect(guest.locator('.go-seat').first()).toContainText('Choosing')
    await lock(host).click()
    await expect(lock(host)).toContainText('Locked in')
    // The guest sees the host has picked, as a card back, never which card.
    await expect(guest.locator('.go-seat').first()).toContainText('Picked')
    await expect(
      guest.locator('.go-seat').first().locator('.go-card__back')
    ).toHaveCount(1)

    await hand(guest).first().click()
    await lock(guest).click()
    // Both picks land face up, and the hands pass left.
    await expect(hand(host)).toHaveCount(9)
    await expect(host.locator('.go-bar__turn')).toHaveText(
      'Round 1 of 3 · turn 2'
    )
    await expect(
      host.locator('.go-seat.is-you .go-card.is-played')
    ).toHaveCount(1)
    await expect(host.locator('.go-hand__meta')).toContainText('passed from')
  })
})

const { test, expect } = require('@playwright/test')
const { RECIPE, visit, signIn, openEdit } = require('./helpers')

// Live activity and edits: two browsers on one page. These run once, on
// desktop: each test drives two pages, and the server's channels are shared.
test.describe('live', () => {
  test.describe.configure({ mode: 'serial' })
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'two browsers, once')
  })

  test('readers see who else has the page open, and an editor in the form', async ({
    browser,
  }) => {
    const reader = await (await browser.newContext()).newPage()
    const other = await (await browser.newContext()).newPage()
    await visit(reader, RECIPE)
    await expect(reader.locator('.presence__count')).toHaveText('Just you here')

    await visit(other, RECIPE)
    await expect(reader.locator('.presence__count')).toHaveText(
      '2 cooking this now'
    )
    // The faces open the names, the reader's own among them.
    await reader.locator('.presence__faces').click()
    await expect(reader.locator('.presence__names li')).toHaveCount(2)
    await expect(reader.locator('.presence__names')).toContainText('You')
    await reader.keyboard.press('Escape')
    await expect(reader.locator('.presence__names')).toHaveCount(0)

    // A signed-in editor opening the form shows as one, beside the readers.
    const editor = await (await browser.newContext()).newPage()
    await signIn(editor)
    await openEdit(editor, RECIPE)
    await expect(reader.locator('.presence__editor')).toContainText(
      'Being edited by an editor'
    )
    await expect(reader.locator('.presence__count')).toHaveText('3 reading')
    // The editor's own row keeps Drupal's menu beside the faces.
    await expect(
      editor.locator('.page-tabs__aside .drupal-links')
    ).toBeVisible()
  })

  test('a Drupal save reaches an open page before the site rebuilds', async ({
    browser,
  }) => {
    test.setTimeout(120000)
    const reader = await (await browser.newContext()).newPage()
    const editor = await (await browser.newContext()).newPage()
    await visit(reader, RECIPE)
    const cell = reader.locator('[data-field="field_cooking_time"]')
    const minutes = async () =>
      Number(
        (await cell.locator('.stat-grid__value').innerText()).match(/\d+/)[0]
      )
    const original = await minutes()

    await signIn(editor)
    await openEdit(editor, RECIPE)
    const save = async (value) => {
      await editor.fill('#field_cooking_time', String(value))
      await editor.locator('.edit-actions__save').click()
      await expect(
        editor.locator('.b-toast', { hasText: 'Saved to Drupal' }).last()
      ).toBeVisible()
      await editor.locator('.b-toast .close').last().click()
    }
    try {
      await save(original + 5)
      // Well inside the rebuild's minute: this is the live path.
      await expect.poll(minutes, { timeout: 15000 }).toBe(original + 5)
      await expect(reader.locator('.presence__pill')).toContainText(
        'Updated from Drupal just now'
      )
      await expect(reader.locator('.presence__pill')).toContainText(
        'cooking time'
      )
      await expect(cell).toHaveClass(/is-fresh/)
    } finally {
      await save(original)
    }
    await expect.poll(minutes, { timeout: 15000 }).toBe(original)
  })

  // Someone else's save refreshes open pages, but never over a draft: the
  // editor's unsaved photograph stays on the page that holds it.
  test('a content change leaves a page with a draft alone', async ({
    page,
    request,
  }) => {
    const secret = process.env.DRUXT_CACHE_SECRET || 'local-test'
    await signIn(page)
    await openEdit(page, RECIPE)
    const fileOf = (locator) => () =>
      locator.getAttribute('src').then((src) => String(src).split('/').pop())
    const hero = fileOf(page.locator('.node-hero img').first())
    const widget = fileOf(page.locator('.edit-media img'))
    await page.click('text=Library')
    await page.locator('.media-browser__item').nth(1).click()
    await page.click('text=Use this photograph')
    await expect(page.locator('.edit-actions__kept')).toBeVisible()
    const picked = await widget()
    await page.locator('.page-tabs__tab').nth(0).click()
    await expect.poll(hero).toBe(picked)
    // A purge as Drupal sends it, for a node this page cannot match by id.
    const response = await request.post('/_druxt/cache/clear', {
      headers: { 'X-Druxt-Secret': secret, 'Content-Type': 'text/plain' },
      data: 'node:999999,node_list,media:999999',
    })
    expect(response.status()).toBe(204)
    await page.waitForTimeout(4000)
    expect(await hero()).toBe(picked)
    await page.locator('.page-tabs__tab').nth(1).click()
    await page.click('.edit-actions__cancel')
  })
})

const { test, expect } = require('@playwright/test')
const {
  RECIPE,
  watchErrors,
  signIn,
  openEdit,
  visit,
  hydrated,
} = require('./helpers')

// An editor's unsaved change is a draft: the form keeps it, the View tab
// shows it, a reload finds it, Cancel puts Drupal's version back. Nothing
// here is saved to Drupal.
test.describe('drafts', () => {
  test.describe.configure({ mode: 'serial' })

  test('a photograph picked from the library previews and persists', async ({
    page,
  }) => {
    const errors = watchErrors(page)
    await signIn(page)
    await visit(page, RECIPE)
    // The hero's URL is absolute and the widget's a path: the file name is
    // what both share.
    const fileOf = (locator) => () =>
      locator.getAttribute('src').then((src) => String(src).split('/').pop())
    const hero = fileOf(page.locator('.node-hero img').first())
    const widget = fileOf(page.locator('.edit-media img'))
    const before = await hero()

    await page.locator('.page-tabs__tab').nth(1).click()
    await page.locator('.edit-form').waitFor()
    await expect.poll(widget).toBe(before)
    await page.click('text=Library')
    const items = page.locator('.media-browser__item')
    await expect(items.nth(1)).toBeVisible()
    await items.nth(1).click()
    await page.click('text=Use this photograph')

    // The widget shows the pick, and Save counts it.
    await expect.poll(widget).not.toBe(before)
    const picked = await widget()
    await expect(page.locator('.edit-actions__save')).toHaveCount(1)
    await expect(page.locator('.edit-actions__save')).toContainText('1')
    await expect(page.locator('.edit-actions__kept')).toBeVisible()

    // The View tab shows the draft.
    await page.locator('.page-tabs__tab').nth(0).click()
    await expect.poll(hero).toBe(picked)

    // A reload finds the draft on both tabs.
    await page.reload()
    await hydrated(page)
    await expect.poll(hero).toBe(picked)
    await page.locator('.page-tabs__tab').nth(1).click()
    await expect.poll(widget).toBe(picked)
    await expect(page.locator('.edit-actions__save')).toHaveCount(1)
    await expect(page.locator('.edit-actions__save')).toContainText('1')

    // Cancel puts Drupal's photograph back, on both tabs, and drops the draft.
    await page.click('.edit-actions__cancel')
    await expect.poll(widget).toBe(before)
    await expect(page.locator('.edit-actions__save')).toBeDisabled()
    await page.locator('.page-tabs__tab').nth(0).click()
    await expect.poll(hero).toBe(before)
    expect(
      await page.evaluate(() => window.localStorage.getItem('umamiDrafts')),
    ).toBeNull()
    expect(errors).toEqual([])
  })

  test('a typed title previews on View and survives a reload', async ({
    page,
  }) => {
    await signIn(page)
    await openEdit(page, RECIPE)
    const original = await page.locator('#title').inputValue()
    await page.fill('#title', `${original} draft`)
    await page.locator('.page-tabs__tab').nth(0).click()
    await expect(page.locator('h1').first()).toContainText(`${original} draft`)
    await page.reload()
    await hydrated(page)
    await expect(page.locator('h1').first()).toContainText(`${original} draft`)
    await page.locator('.page-tabs__tab').nth(1).click()
    await expect(page.locator('#title')).toHaveValue(`${original} draft`)
    await page.click('.edit-actions__cancel')
    await expect(page.locator('#title')).toHaveValue(original)
  })

  test('a signed-in editor sees the reset control, a visitor does not', async ({
    page,
  }) => {
    await visit(page, '/en')
    await expect(page.locator('.reset-demo__button')).toHaveCount(0)
    await signIn(page)
    await visit(page, '/en')
    // In the demo bar from md up; in the drawer's Druxt block on a phone.
    const menu = page.locator('button[aria-label="Open menu"]')
    if (await menu.isVisible()) await menu.click()
    await expect(page.locator('.reset-demo__button:visible')).toBeVisible()
    await expect(page.locator('.banner__media').first()).toBeVisible()
  })
})

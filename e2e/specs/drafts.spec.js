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

    // The View tab shows the draft, and marking outlines the photograph
    // with the one it replaced.
    await page.locator('.page-tabs__tab').nth(0).click()
    await expect.poll(hero).toBe(picked)
    await page.locator('.draft-banner__diff-toggle').click()
    const swap = page.locator('.page-tabs__pane .v-diff-swap').first()
    await expect(swap).toBeVisible()
    await expect(swap.locator('img')).toHaveAttribute('src', new RegExp(before))
    await page.locator('.draft-banner__diff-toggle').click()
    await expect(page.locator('.v-diff-swap')).toHaveCount(0)
    // Marks off, the photograph is still the draft's; Drupal's version shows
    // the old one, and the draft comes back whole.
    await expect.poll(hero).toBe(picked)
    await page.locator('.draft-banner__option').nth(1).click()
    await expect.poll(hero).toBe(before)
    await page.locator('.draft-banner__option').nth(0).click()
    await expect.poll(hero).toBe(picked)

    // A reload finds the draft on both tabs.
    await page.reload()
    await hydrated(page)
    await expect.poll(hero).toBe(picked)
    await page.locator('.page-tabs__tab').nth(1).click()
    await expect.poll(widget).toBe(picked)
    await expect(page.locator('.edit-actions__save')).toHaveCount(1)
    await expect(page.locator('.edit-actions__save')).toContainText('1')

    // Removing the photograph leaves the page nothing to mark: the banner
    // lists it with the one it was.
    await page.click('.edit-media .is-remove')
    await page.locator('.page-tabs__tab').nth(0).click()
    await page.locator('.draft-banner__diff-toggle').click()
    const removed = page.locator('.draft-banner__removed li').first()
    await expect(removed).toContainText('Removed')
    await expect(removed.locator('img')).toHaveAttribute(
      'src',
      new RegExp(before),
    )
    await page.locator('.draft-banner__diff-toggle').click()
    await page.locator('.page-tabs__tab').nth(1).click()

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

  test('a draft on the English page stays off the Spanish one', async ({
    page,
  }) => {
    await signIn(page)
    await openEdit(page, RECIPE)
    const original = await page.locator('#title').inputValue()
    await page.fill('#title', `${original} only in English`)
    await expect(page.locator('.draft-banner')).toBeVisible()
    await visit(page, '/es/recipes/crema-catalana')
    await expect(page.locator('.draft-banner')).toHaveCount(0)
    await expect(page.locator('h1').first()).not.toContainText(
      'only in English',
    )
    await openEdit(page, RECIPE)
    await page.click('.edit-actions__cancel')
    await expect(page.locator('.draft-banner')).toHaveCount(0)
  })

  test('a draft is announced, switchable and marked in the page', async ({
    page,
  }) => {
    await signIn(page)
    await openEdit(page, RECIPE)
    await expect(page.locator('.draft-banner')).toHaveCount(0)
    const original = await page.locator('#title').inputValue()
    await page.fill('#title', `${original} banner`)
    await expect(page.locator('.draft-banner')).toBeVisible()
    await expect(page.locator('.draft-banner__kicker')).toContainText(/draft/i)

    // View shows the draft; Drupal's version puts the real title back.
    await page.locator('.page-tabs__tab').nth(0).click()
    await expect(page.locator('h1').first()).toContainText(`${original} banner`)
    await page.locator('.draft-banner__option').nth(1).click()
    await expect(page.locator('h1').first()).not.toContainText('banner')
    await page.locator('.draft-banner__option').nth(0).click()
    await expect(page.locator('h1').first()).toContainText(`${original} banner`)

    // The marks: the new word is underlined in the title itself, and the
    // switch to Drupal's version takes the marks with it.
    await page.locator('.draft-banner__diff-toggle').click()
    const marks = page.locator('.page-tabs__pane ins.v-diff-ins')
    await expect(marks.first()).toContainText('banner')
    await page.locator('.draft-banner__option').nth(1).click()
    await expect(marks).toHaveCount(0)
    await page.locator('.draft-banner__option').nth(0).click()
    await expect(marks.first()).toContainText('banner')
    await page.locator('.draft-banner__diff-toggle').click()
    await expect(marks).toHaveCount(0)

    await page.locator('.page-tabs__tab').nth(1).click()
    await page.click('.edit-actions__cancel')
    await expect(page.locator('.draft-banner')).toHaveCount(0)
  })

  test('rich text typed in the editor previews on View', async ({ page }) => {
    await signIn(page)
    await openEdit(page, RECIPE)
    const editor = page.locator('.ck-editor__editable').first()
    await editor.waitFor()
    await editor.click()
    await page.keyboard.press('End')
    await page.keyboard.type(' Typed in the editor.')
    await page.locator('.page-tabs__tab').nth(0).click()
    await expect(page.locator('.page-tabs__pane').first()).toContainText(
      'Typed in the editor.',
    )
    await page.locator('.page-tabs__tab').nth(1).click()
    await page.click('.edit-actions__cancel')
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

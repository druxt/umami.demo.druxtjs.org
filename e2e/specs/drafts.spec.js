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
      new RegExp(before)
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
      await page.evaluate(() => window.localStorage.getItem('umamiDrafts'))
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

  test('a draft can be thrown away from the banner', async ({ page }) => {
    await signIn(page)
    await openEdit(page, RECIPE)
    const original = await page.locator('#title').inputValue()
    await page.fill('#title', `${original} to discard`)
    await expect(page.locator('.draft-banner')).toBeVisible()
    // It asks once; keeping it changes nothing.
    await page.click('.draft-banner__discard')
    await page.click('.draft-banner__discard-no')
    await expect(page.locator('.draft-banner')).toBeVisible()
    // From the keyboard: focus moves to the question, Escape hands it back.
    await page.focus('.draft-banner__discard')
    await page.keyboard.press('Enter')
    await expect(page.locator('.draft-banner__discard-no')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('.draft-banner__confirm')).toHaveCount(0)
    await expect(page.locator('.draft-banner__discard')).toBeFocused()
    await page.click('.draft-banner__discard')
    await page.click('.draft-banner__discard-yes')
    await expect(page.locator('.draft-banner')).toHaveCount(0)
    // Focus lands on the page's heading, not back at the top.
    await expect(page.locator(':focus')).toHaveCount(1)
    expect(
      await page.evaluate(() => /^H[12]$/.test(document.activeElement.tagName))
    ).toBe(true)
    // The open form shows Drupal's title again, and a reload finds no draft.
    await expect(page.locator('#title')).toHaveValue(original)
    await page.reload()
    await hydrated(page)
    await expect(page.locator('.draft-banner')).toHaveCount(0)
    await expect(page.locator('h1').first()).toContainText(original)
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
      'only in English'
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
    // The summary reads the same in either version: light where it sits on
    // the photograph, from lg up, and ink on paper below it.
    const summary = page.locator('.node-head__summary').first()
    const color = await summary.evaluate((el) => getComputedStyle(el).color)
    if ((page.viewportSize() || {}).width >= 992) {
      expect(color).toBe('rgb(239, 228, 214)')
    }
    await page.locator('.draft-banner__option').nth(1).click()
    await expect(page.locator('h1').first()).not.toContainText('banner')
    await expect(summary).toHaveCSS('color', color)
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

  // A list marks the rows a change touched, each against the line it
  // replaced, not every row against the whole list. Swapping two ingredients
  // moves one line: it reads as removed where it was and added where it went.
  test('a moved ingredient is marked on its own rows', async ({ page }) => {
    await signIn(page)
    await openEdit(page, RECIPE)
    const inputs = page.locator('.edit-list__input')
    const count = await inputs.count()
    const first = await inputs.nth(0).inputValue()
    const second = await inputs.nth(1).inputValue()
    await inputs.nth(0).fill(second)
    await inputs.nth(1).fill(first)
    await page.locator('.page-tabs__tab').nth(0).click()
    await page.locator('.draft-banner__diff-toggle').click()

    const list = page.locator('.recipe-ingredients')
    await expect(list.locator('del.v-diff-del')).toHaveCount(1)
    await expect(list.locator('ins.v-diff-ins')).toHaveCount(1)
    await expect(list.locator('.list-group-item')).toHaveCount(count + 1)

    await page.locator('.draft-banner__diff-toggle').click()
    await page.locator('.page-tabs__tab').nth(1).click()
    await page.click('.edit-actions__cancel')
    await expect(page.locator('.draft-banner')).toHaveCount(0)
  })

  test('an edited method step is marked on its own step', async ({ page }) => {
    await signIn(page)
    await openEdit(page, RECIPE)
    const second = page.locator('.edit-steps__input').nth(1)
    const original = await second.inputValue()
    await second.fill(`${original} extra`)
    await page.locator('.page-tabs__tab').nth(0).click()
    await page.locator('.draft-banner__diff-toggle').click()

    const steps = page.locator('.method-step')
    await expect(steps.nth(1).locator('ins.v-diff-ins')).toContainText('extra')
    await expect(page.locator('.method-steps ins.v-diff-ins')).toHaveCount(1)
    await expect(page.locator('.method-steps del.v-diff-del')).toHaveCount(0)

    await page.locator('.draft-banner__diff-toggle').click()
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
      'Typed in the editor.'
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

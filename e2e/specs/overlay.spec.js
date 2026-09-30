const { test, expect } = require('@playwright/test')
const { ARTICLE, watchErrors, overlayOn, visit } = require('./helpers')

// The dev overlay is restored after hydration, so a page with it on still
// re-renders: the Edit tab, the menu and the debug panel keep working. It
// once did not, and every control on every node page went dead.
test.describe('dev overlay', () => {
  test('a node page with the overlay on hydrates and its Edit tab works', async ({
    page,
  }) => {
    await overlayOn(page)
    const errors = watchErrors(page)
    await visit(page, ARTICLE)
    await expect(page.locator('.druxt-inspector-label').first()).toBeVisible()
    await page.locator('.page-tabs__tab').nth(1).click()
    await expect(page.locator('.page-tabs__tab').nth(1)).toHaveClass(
      /is-active/,
    )
    await expect(page.locator('.edit-form')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('labels name the form and its fields on the contact page', async ({
    page,
  }) => {
    await overlayOn(page)
    await visit(page, '/en/contact')
    await expect(page.locator('[data-druxt="form"]')).toHaveCount(1)
    await expect(
      page.locator('.druxt-inspector-label', { hasText: 'DruxtEntityForm' }),
    ).toBeVisible()
    await expect
      .poll(() => page.locator('[data-druxt="field"]').count())
      .toBeGreaterThan(2)
  })

  test('labels sit above their component, never over the tabs', async ({
    page,
  }) => {
    await overlayOn(page)
    await visit(page, ARTICLE)
    await expect(page.locator('.druxt-inspector-label').first()).toBeVisible()
    const tab = await page.locator('.page-tabs__tab').nth(1).boundingBox()
    const hit = await page.evaluate(
      ([x, y]) => (document.elementFromPoint(x, y) || {}).className || '',
      [tab.x + tab.width / 2, tab.y + tab.height / 2],
    )
    expect(hit).toContain('page-tabs__tab')
  })
})

const { test, expect } = require('@playwright/test')
const AxeBuilder = require('@axe-core/playwright').default
const {
  visit,
  signIn,
  openEdit,
  openSearch,
  openSignIn,
  RECIPE,
} = require('./helpers')

// The pages a visitor and an editor meet, checked with axe-core against
// WCAG 2.1 A and AA. Any finding fails: the list is the work to do.
const PAGES = [
  '/en',
  '/es',
  RECIPE,
  '/en/articles/give-your-oatmeal-the-ultimate-makeover',
  '/en/recipes',
  '/en/about-umami',
  '/en/contact',
  '/en/tags/vegan',
  '/play',
]

const audit = (page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

const describe = (violations) =>
  violations
    .map(
      (v) =>
        `${v.impact}: ${v.id} (${v.nodes.length}) ${v.help}\n  ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join('\n  ')}`,
    )
    .join('\n')

test.describe('accessibility', () => {
  for (const path of PAGES) {
    test(`${path} has no accessibility failures`, async ({ page }) => {
      await visit(page, path)
      const { violations } = await audit(page)
      if (violations.length) console.log(`${path}\n${describe(violations)}`)
      expect(
        violations.map((v) => v.id),
        describe(violations),
      ).toEqual([])
    })
  }

  test('the sign-in dialog has no accessibility failures', async ({ page }) => {
    await visit(page, '/en')
    await openSignIn(page)
    const { violations } = await audit(page)
    if (violations.length) console.log(`sign in\n${describe(violations)}`)
    expect(
      violations.map((v) => v.id),
      describe(violations),
    ).toEqual([])
  })

  test('the search panel has no accessibility failures', async ({ page }) => {
    await visit(page, '/en')
    await openSearch(page)
    // With results and facets in it, not the empty panel.
    await page.locator('.searchbar:visible input').fill('sugar')
    await page.locator('.searchbar:visible .searchbar__chip').first().waitFor()
    const { violations } = await audit(page)
    if (violations.length) console.log(`search\n${describe(violations)}`)
    expect(
      violations.map((v) => v.id),
      describe(violations),
    ).toEqual([])
  })

  test('the edit form and a draft have no accessibility failures', async ({
    page,
  }) => {
    await signIn(page)
    await openEdit(page, RECIPE)
    const { violations } = await audit(page)
    if (violations.length) console.log(`edit\n${describe(violations)}`)
    expect(
      violations.map((v) => v.id),
      describe(violations),
    ).toEqual([])

    // A draft brings the banner, its switch, its marks and the discard step.
    const original = await page.locator('#title').inputValue()
    await page.fill('#title', `${original} audited`)
    await expect(page.locator('.draft-banner')).toBeVisible()
    await page.click('.draft-banner__diff-toggle')
    await page.click('.draft-banner__discard')
    await expect(page.locator('.draft-banner__confirm')).toBeVisible()
    const drafted = await audit(page)
    if (drafted.violations.length) {
      console.log(`draft\n${describe(drafted.violations)}`)
    }
    expect(
      drafted.violations.map((v) => v.id),
      describe(drafted.violations),
    ).toEqual([])
    await page.click('.draft-banner__discard-yes')
    await expect(page.locator('.draft-banner')).toHaveCount(0)
  })
})

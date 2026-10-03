const { test, expect } = require('@playwright/test')
const { visit } = require('./helpers')

// The contact form: Drupal's fields in one column with one rhythm, and the
// message Drupal stores shown back as code.
test.describe('contact', () => {
  test('every field sits the same distance from the next', async ({ page }) => {
    await visit(page, '/en/contact')
    const gapAfter = (selector, next) =>
      page.evaluate(
        ([a, b]) => {
          const box = (s) => document.querySelector(s).getBoundingClientRect()
          return Math.round(box(b).top - box(a).bottom)
        },
        [selector, next]
      )
    // The email widget is a b-form-group; the subject is the site's own.
    const afterMail = await gapAfter('#mail-field', '#subject')
    const afterSubject = await gapAfter('#subject', '#message-field')
    expect(afterSubject).toBeGreaterThan(0)
    expect(Math.abs(afterSubject - afterMail)).toBeLessThanOrEqual(2)
  })

  test('the stored message reads as code, one line per row', async ({
    page,
  }) => {
    await visit(page, '/en/contact')
    await page.fill('#name-field', 'Test visitor')
    await page.fill('#mail-field', 'visitor@example.com')
    await page.fill('#subject', 'A test message')
    await page.fill('#message-field', 'Sent by the end-to-end suite.')
    await page.getByRole('button', { name: 'Send message' }).click()
    const rows = page.locator('.form-page__sent .vjs-tree-node')
    await expect(rows.first()).toBeVisible()
    const heights = await rows.evaluateAll((nodes) =>
      nodes.map((n) => Math.round(n.getBoundingClientRect().height))
    )
    expect(Math.max(...heights)).toBeLessThanOrEqual(Math.min(...heights) + 1)
  })
})

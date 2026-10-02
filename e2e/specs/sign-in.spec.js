const { test, expect } = require('@playwright/test')
const { openSignIn, visit } = require('./helpers')

// Sign in happens where the reader is: the link opens a dialog over the page
// and the page stays put. /login is the same form for a reader without
// JavaScript, or one who opens the link in a tab of its own.
test.describe('sign in', () => {
  test('the link opens a dialog, and signing in stays on the page', async ({
    page,
  }) => {
    await visit(page, '/en/recipes')
    await openSignIn(page)
    await expect(page).toHaveURL(/\/en\/recipes$/)
    const dialog = page.locator('.sign-in__dialog')
    await expect(dialog.locator('#login-name')).toBeFocused()
    await dialog.locator('#login-name').fill(process.env.E2E_USER || 'admin')
    await dialog.locator('#login-pass').fill(process.env.E2E_PASS || 'admin')
    await dialog.locator('.auth__submit').click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/en\/recipes$/)
    await expect(
      page.locator('button', { hasText: 'Sign out' }).first(),
    ).toBeAttached()
  })

  test('a wrong password is said in the dialog', async ({ page }) => {
    await visit(page, '/en')
    await openSignIn(page)
    const dialog = page.locator('.sign-in__dialog')
    await dialog.locator('#login-name').fill('admin')
    await dialog.locator('#login-pass').fill('not the password')
    await dialog.locator('.auth__submit').click()
    await expect(dialog.locator('[role="alert"]')).toBeVisible()
  })

  test('Escape closes the dialog and hands focus back', async ({ page }) => {
    await visit(page, '/en')
    await openSignIn(page)
    await page.keyboard.press('Escape')
    await expect(page.locator('.sign-in__dialog')).toBeHidden()
  })

  test('the link is still a link to the page', async ({ page }) => {
    await visit(page, '/en')
    await expect(
      page.locator('a.masthead__account, .masthead__account a').first(),
    ).toHaveAttribute('href', '/login')
    await visit(page, '/login')
    await expect(page.locator('h1')).toContainText('Sign in')
    await expect(page.locator('#login-name')).toBeVisible()
  })
})

const ARTICLE = '/en/articles/give-your-oatmeal-the-ultimate-makeover'
const RECIPE = '/en/recipes/crema-catalana'

/** Collect uncaught errors: a broken page renders and does nothing. */
function watchErrors(page) {
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  return errors
}

/** The dev overlay on before the page loads, as a returning visitor has it. */
async function overlayOn(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        'umamiUi',
        JSON.stringify({ ui: { devOverlay: true } }),
      )
    } catch (e) {
      // No storage: the switch stays off.
    }
  })
}

/** Sign in through the site's own form with the password grant. */
async function signIn(page) {
  await visit(page, '/login')
  await page.fill('#login-name', process.env.E2E_USER || 'admin')
  await page.fill('#login-pass', process.env.E2E_PASS || 'admin')
  await page.click('.auth__submit')
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 30000,
  })
  await hydrated(page)
}

/**
 * A generated page is markup before Vue takes it over: a click before that
 * lands on nothing. Wait for the app to be mounted.
 */
async function hydrated(page) {
  await page.waitForFunction(() => window.$nuxt && window.$nuxt._isMounted)
}

/** Load a page and wait until it is live. */
async function visit(page, path) {
  await page.goto(path)
  await hydrated(page)
}

/** Open the Edit tab on a node page and wait for its form. */
async function openEdit(page, path) {
  await visit(page, path)
  await page.locator('.page-tabs__tab').nth(1).click()
  await page.locator('.edit-form').waitFor()
}

module.exports = {
  ARTICLE,
  RECIPE,
  watchErrors,
  overlayOn,
  signIn,
  hydrated,
  visit,
  openEdit,
}

# Browser tests

Playwright specs that run against the generated site and its Drupal, the way
the pipeline runs them, plus an accessibility audit and a Lighthouse run
that fail below their floors.

```bash
npm ci
npx playwright install --with-deps chromium

# Everything, on a phone and a desktop viewport.
E2E_BASE_URL=http://127.0.0.1:3000 E2E_USER=admin E2E_PASS=admin npm test

# The accessibility audit alone: axe-core over the main pages, the search
# panel and the edit form. Any finding fails.
E2E_BASE_URL=http://127.0.0.1:3000 E2E_USER=admin E2E_PASS=admin npm run test:a11y

# Lighthouse on a phone, with score floors (lighthouserc.js). Reports land
# in lighthouse/.
CHROME_PATH="$(node -e "console.log(require('@playwright/test').chromium.executablePath())")" \
  E2E_BASE_URL=http://127.0.0.1:3000 npm run lighthouse
```

`E2E_BASE_URL` is the site under test. `E2E_USER` and `E2E_PASS` sign the
editor in for the drafts, edit form and reset specs; on Lagoon the password is
the environment's `DRUPAL_ACCOUNT_PASS`.

The pipeline's `test:e2e` job runs the whole suite, and `test:lighthouse` the
audit, both against the stack `test:stack` builds.

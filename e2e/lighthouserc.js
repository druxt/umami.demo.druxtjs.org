/**
 * Lighthouse over the generated site, the pages a visitor meets. Run by
 * `npm run lighthouse` against E2E_BASE_URL, in CI after the browser tests.
 * The scores are floors: a change that drops one fails the job.
 */
const base = (process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/+$/,
  '',
)

module.exports = {
  ci: {
    collect: {
      url: [
        `${base}/en`,
        `${base}/es`,
        `${base}/en/recipes`,
        `${base}/en/recipes/crema-catalana`,
        `${base}/en/articles/give-your-oatmeal-the-ultimate-makeover`,
        `${base}/en/about-umami`,
      ],
      // Three runs a page: one CI sample swings by twenty points.
      numberOfRuns: 3,
      settings: {
        // The flags a container needs: no sandbox, no /dev/shm, no GPU.
        chromeFlags:
          '--no-sandbox --headless=new --disable-dev-shm-usage --disable-gpu',
        // A phone, which is where the scores are hardest to earn.
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 2,
        },
      },
    },
    assert: {
      assertions: {
        // Mobile performance sits in the sixties while the demo's photographs
        // go out at full size; the floor rises with each step that lifts it.
        'categories:performance': [
          'error',
          { aggregationMethod: 'median-run', minScore: 0.6 },
        ],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: 'lighthouse',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%.%%EXTENSION%%',
    },
  },
}

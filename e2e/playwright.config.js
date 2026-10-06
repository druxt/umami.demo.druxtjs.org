// @ts-check
const { defineConfig, devices } = require('@playwright/test')

/**
 * The generated site, served by server/start.js, against a provisioned
 * Drupal: what CI's stack job runs. E2E_BASE_URL points at the site;
 * E2E_USER and E2E_PASS are an editor's Drupal account.
 */
module.exports = defineConfig({
  testDir: './specs',
  timeout: 90000,
  expect: { timeout: 15000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['list'], ['junit', { outputFile: 'results/junit.xml' }]]
    : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 5'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
})

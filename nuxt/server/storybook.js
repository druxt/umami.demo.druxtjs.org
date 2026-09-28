#!/usr/bin/env node
/**
 * Start Storybook once Drupal is provisioned: its build reads the backend, and
 * fails outright while Drupal is still installing.
 */
const { spawn } = require('child_process')
const path = require('path')
const { waitForDrupal } = require('./drupal')

const env = process.env
const drupalUrl = env.DRUPAL_URL || 'http://nginx:8080'
const log = (message) => process.stdout.write(`storybook: ${message}\n`)

waitForDrupal(drupalUrl, log).then(() => {
  log(`Drupal is ready at ${drupalUrl}`)
  const child = spawn('yarn', ['storybook', '-p', env.PORT || '3000'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  })
  child.on('exit', (code, signal) => {
    log(`Storybook exited with ${signal || code}`)
    process.exit(code || 1)
  })
})

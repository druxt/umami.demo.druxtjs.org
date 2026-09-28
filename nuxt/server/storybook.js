#!/usr/bin/env node
/**
 * Start Storybook once Drupal is provisioned: its build reads the backend, and
 * fails outright while Drupal is still installing.
 *
 * The port answers from the start, with a starting page, so the platform
 * counts the service as up. Drupal is installed after every service is up,
 * so a port held back until Drupal answers is never opened at all.
 */
const http = require('http')
const path = require('path')
const { spawn } = require('child_process')
const { createDrupalProxy, waitForDrupal } = require('./drupal')

const env = process.env
const port = Number(env.PORT) || 3000
const host = env.HOST || '0.0.0.0'
const inner = port + 1
const drupalUrl = env.DRUPAL_URL || 'http://nginx:8080'
const log = (message) => process.stdout.write(`storybook: ${message}\n`)

const starting = (req, res) => {
  res.writeHead(503, {
    'Content-Type': 'text/html; charset=utf-8',
    'Retry-After': '30',
  })
  res.end('<!doctype html><title>Starting</title><p>Storybook is starting.</p>')
}

let handler = starting
const server = http.createServer((req, res) => handler(req, res))

/** Resolves once Storybook answers on its own port. */
const waitForStorybook = async () => {
  for (;;) {
    const up = await new Promise((resolve) => {
      http
        .get(
          { host: '127.0.0.1', port: inner, path: '/iframe.html' },
          (res) => {
            res.resume()
            resolve(res.statusCode === 200)
          }
        )
        .on('error', () => resolve(false))
    })
    if (up) return
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
}

const main = async () => {
  await new Promise((resolve) => server.listen(port, host, resolve))
  log(`starting page on http://${host}:${port}`)

  await waitForDrupal(drupalUrl, log)
  log(`Drupal is ready at ${drupalUrl}`)

  const child = spawn(
    'yarn',
    ['storybook', '-p', String(inner), '-h', '127.0.0.1', '--ci'],
    { cwd: path.join(__dirname, '..'), stdio: 'inherit' }
  )
  child.on('error', (error) => {
    log(`Storybook could not start: ${error.message}`)
    process.exit(1)
  })
  child.on('exit', (code, signal) => {
    log(`Storybook exited with ${signal || code}`)
    process.exit(code || 1)
  })

  await waitForStorybook()
  handler = createDrupalProxy(`http://127.0.0.1:${inner}`)
  log(`serving Storybook from port ${inner}`)
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 10000).unref()
  })
}

main().catch((error) => {
  process.stderr.write(`storybook: ${error.stack || error}\n`)
  process.exit(1)
})

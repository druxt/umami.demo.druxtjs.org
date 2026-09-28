#!/usr/bin/env node
/**
 * Start the site: hold the port while Drupal comes up, generate the site
 * against it, then serve the generated files with Drupal's paths proxied.
 *
 * The build reads Drupal (display schemas, languages, the search index), so it
 * runs here rather than in the image, where the environment's own Drupal does
 * not exist yet. Each deploy reinstalls Drupal, so the post-rollout task asks
 * for a fresh build with `POST /_regenerate`; the old build serves until the
 * new one is complete.
 */
const fs = require('fs')
const http = require('http')
const path = require('path')
const { spawn } = require('child_process')
const { createDrupalProxy, isDrupalPath, waitForDrupal } = require('./drupal')

const rootDir = path.join(__dirname, '..')
const env = process.env
const port = Number(env.PORT) || 3000
const host = env.HOST || '0.0.0.0'
const drupalUrl = env.DRUPAL_URL || 'http://nginx:8080'
// The origin visitors reach the site on: on Lagoon, the environment's first
// route, which .lagoon.yml gives to this service.
const siteOrigin = (
  env.SITE_ORIGIN ||
  env.LAGOON_ROUTE ||
  `http://127.0.0.1:${port}`
).replace(/\/+$/, '')
const loopback = path.join(__dirname, 'loopback.js')
// Hosts a regenerate request may name: only the internal network reaches
// the container under these, never a public route.
const internalHosts = (env.REGENERATE_HOSTS || 'app,localhost,127.0.0.1')
  .split(',')
  .map((name) => name.trim())
const log = (message) => process.stdout.write(`start: ${message}\n`)

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const starting = (req, res) => {
  res.writeHead(503, { 'Content-Type': TYPES['.html'], 'Retry-After': '30' })
  res.end('<!doctype html><title>Starting</title><p>The demo is starting.</p>')
}

// The generated build being served.
let distDir = null

/**
 * The generated file for a request path: the file itself, else the route's
 * index.html, else the client-side fallback.
 *
 * @param {string} pathname - The decoded request path.
 * @returns {string} An absolute path inside the dist directory.
 */
const resolveFile = (pathname) => {
  const file = path.join(distDir, pathname)
  if (!file.startsWith(distDir + path.sep))
    return path.join(distDir, '200.html')
  for (const candidate of [file, path.join(file, 'index.html')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }
  return path.join(distDir, '200.html')
}

const serveStatic = (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost')
  // English is prefixed, so the front page is /en and "/" is not a page.
  if (pathname === '/') {
    res.writeHead(301, { Location: '/en' })
    return res.end()
  }
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch (e) {
    res.writeHead(400)
    return res.end()
  }
  const file = resolveFile(decoded)
  const headers = {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
  }
  if (decoded.startsWith('/_nuxt/')) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable'
  }
  res.writeHead(200, headers)
  fs.createReadStream(file).pipe(res)
}

// The running `nuxt generate`, stopped with the server.
let building = null

const generate = (dir) =>
  new Promise((resolve, reject) => {
    const bin = path.join(rootDir, 'node_modules', 'nuxt', 'bin', 'nuxt.js')
    const child = spawn(process.execPath, [bin, 'generate'], {
      cwd: rootDir,
      // The build names the public origin, and reads it through this
      // server's own proxy: see loopback.js.
      env: {
        ...env,
        BASE_URL: siteOrigin,
        API_PROXY: '1',
        PUBLIC_BASE_URL: env.PUBLIC_BASE_URL || '',
        GENERATE_DIR: dir,
        LOOPBACK_ORIGIN: siteOrigin,
        LOOPBACK_PORT: String(port),
        NODE_OPTIONS: `${env.NODE_OPTIONS || ''} --require ${loopback}`.trim(),
      },
      stdio: 'inherit',
    })
    building = child
    child.on('error', reject)
    child.on('exit', (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`nuxt generate exited with ${signal || code}`))
    )
  })

let pending = true
let running = false

/**
 * Generate until no request is pending, swapping each build in once it is
 * complete. A failed build keeps the previous one and tries again.
 */
const cycle = async () => {
  if (running) return
  running = true
  while (pending) {
    pending = false
    await waitForDrupal(drupalUrl, log)
    const dir = path.join(rootDir, `dist-${Date.now()}`)
    const started = Date.now()
    try {
      await generate(dir)
    } catch (error) {
      log(`${error.message}; trying again in 30s`)
      fs.rmSync(dir, { recursive: true, force: true })
      pending = true
      await new Promise((resolve) => setTimeout(resolve, 30000))
      continue
    }
    const previous = distDir
    distDir = dir
    log(`generated in ${Math.round((Date.now() - started) / 1000)}s`)
    if (previous) fs.rmSync(previous, { recursive: true, force: true })
  }
  running = false
}

const regenerate = (req, res) => {
  const hostname = String(req.headers.host || '').replace(/:\d+$/, '')
  if (req.method !== 'POST' || !internalHosts.includes(hostname)) {
    return (distDir ? serveStatic : starting)(req, res)
  }
  pending = true
  cycle()
  res.writeHead(202)
  res.end()
}

const drupal = createDrupalProxy(drupalUrl)
const server = http.createServer((req, res) => {
  if (isDrupalPath(req.url)) return drupal(req, res)
  if (req.url === '/_regenerate') return regenerate(req, res)
  return (distDir ? serveStatic : starting)(req, res)
})

const main = async () => {
  // Builds left by an earlier run are never served again.
  for (const name of fs.readdirSync(rootDir)) {
    if (name.startsWith('dist-')) {
      fs.rmSync(path.join(rootDir, name), { recursive: true, force: true })
    }
  }
  await new Promise((resolve) => server.listen(port, host, resolve))
  log(`starting page on http://${host}:${port}`)
  await cycle()
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (building) building.kill(signal)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 10000).unref()
  })
}

main().catch((error) => {
  process.stderr.write(`start: ${error.stack || error}\n`)
  // Exit so the platform restarts the container and tries again.
  process.exit(1)
})

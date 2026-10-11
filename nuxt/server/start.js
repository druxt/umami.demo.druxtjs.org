#!/usr/bin/env node
/**
 * Start the site: hold the port while Drupal comes up, generate the site
 * against it, then serve the generated files with Drupal's paths proxied.
 *
 * The build reads Drupal (display schemas, languages, the search index), so it
 * runs here rather than in the image, where the environment's own Drupal does
 * not exist yet. Each deploy reinstalls Drupal, so the post-rollout task asks
 * for a fresh build with `POST /_regenerate`; the old build serves until the
 * new one is complete. Content changes arrive from Drupal's Purge as Druxt's
 * `POST /_druxt/cache/clear`, and rebuild once saves stop arriving. Open
 * pages hear the purged tags at once on the /_live WebSocket and refetch what
 * they show of them, ahead of the rebuild.
 */
const crypto = require('crypto')
const fs = require('fs')
const http = require('http')
const path = require('path')
const zlib = require('zlib')
const { spawn } = require('child_process')
const { attachSockets } = require('@druxt-contrib/sockets/server')
const { createDrupalProxy, isDrupalPath, waitForDrupal } = require('./drupal')
const { createStartingHandler } = require('./starting')

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
// The secret Drupal's purger sends; without one the endpoint is off.
const cacheSecret = env.DRUXT_CACHE_SECRET || ''
// Seconds without a further clear before the rebuild starts.
const quietPeriod = (Number(env.DRUXT_CACHE_QUIET) || 10) * 1000
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
  '.xml': 'application/xml; charset=utf-8',
}

// What druxtjs.org's starting page reports until the first build serves.
const state = { phase: 'waiting', since: new Date().toISOString() }
const setPhase = (phase) => {
  state.phase = phase
  state.since = new Date().toISOString()
}
const starting = createStartingHandler(state)

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
  // A build asset that is not there is a 404, never the page: a page in its
  // place is cached as the asset for a year, and the search index was.
  if (decoded.startsWith('/_nuxt/') && file.endsWith('200.html')) {
    res.writeHead(404)
    return res.end()
  }
  const headers = {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
  }
  // Hashed assets never change; a page must be checked on every visit, or a
  // phone keeps one whose chunks a later build removed. The search index
  // carries no hash, so it is checked too.
  headers['Cache-Control'] =
    decoded.startsWith('/_nuxt/') && !decoded.startsWith('/_nuxt/search-index')
      ? 'public, max-age=31536000, immutable'
      : 'no-cache'
  // Text goes out compressed: the scripts are the bulk of a page's bytes.
  const encoding = compressionFor(req, headers['Content-Type'])
  if (encoding) {
    headers['Content-Encoding'] = encoding
    headers.Vary = 'Accept-Encoding'
  }
  res.writeHead(200, headers)
  // A build swapped out mid-request loses its files; answer 404, don't crash.
  const stream = fs.createReadStream(file).on('error', () => {
    if (!res.headersSent) res.writeHead(404)
    res.end()
  })
  if (encoding === 'br') {
    stream
      .pipe(
        zlib.createBrotliCompress({
          params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
        })
      )
      .pipe(res)
  } else if (encoding === 'gzip') {
    stream.pipe(zlib.createGzip({ level: 6 })).pipe(res)
  } else {
    stream.pipe(res)
  }
}

/** The encoding a browser takes for a text response, or nothing. */
const compressionFor = (req, type) => {
  if (!/^(text\/|application\/(javascript|json|xml)|image\/svg)/.test(type)) {
    return ''
  }
  const accept = String(req.headers['accept-encoding'] || '')
  if (/\bbr\b/.test(accept)) return 'br'
  if (/\bgzip\b/.test(accept)) return 'gzip'
  return ''
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

/** Every file under a directory, as paths relative to it. */
const listFiles = (dir, base = dir) => {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    return entry.isDirectory()
      ? listFiles(file, base)
      : [path.relative(base, file)]
  })
}

// The files the current build made itself, so a swap carries one build back
// and never a growing pile.
let ownAssets = []

/**
 * A page opened before a swap still asks for the chunks and payloads of the
 * build it loaded with, so the previous build's own assets come along until
 * the next swap.
 */
const carryAssets = (from, to) => {
  for (const rel of ownAssets) {
    const src = path.join(from, '_nuxt', rel)
    const dest = path.join(to, '_nuxt', rel)
    if (fs.existsSync(dest) || !fs.existsSync(src)) continue
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
  }
}

/**
 * Generate until no request is pending, swapping each build in once it is
 * complete. A failed build keeps the previous one and tries again.
 */
const cycle = async () => {
  if (running) return
  running = true
  while (pending) {
    pending = false
    setPhase('waiting')
    await waitForDrupal(drupalUrl, log)
    setPhase('building')
    const dir = path.join(rootDir, `dist-${Date.now()}`)
    const started = Date.now()
    try {
      await generate(dir)
    } catch (error) {
      setPhase('failed')
      log(`${error.message}; trying again in 30s`)
      fs.rmSync(dir, { recursive: true, force: true })
      pending = true
      await new Promise((resolve) => setTimeout(resolve, 30000))
      continue
    }
    setPhase('starting')
    const previous = distDir
    const own = listFiles(path.join(dir, '_nuxt'))
    if (previous) carryAssets(previous, dir)
    ownAssets = own
    distDir = dir
    if (previous) fs.rmSync(previous, { recursive: true, force: true })
    // Logged once the swap is complete: the stack test reads this line.
    log(`generated in ${Math.round((Date.now() - started) / 1000)}s`)
  }
  running = false
}

const regenerate = (req, res) => {
  const hostname = String(req.headers.host || '').replace(/:\d+$/, '')
  if (req.method !== 'POST' || !internalHosts.includes(hostname)) {
    return (distDir ? serveStatic : starting)(req, res)
  }
  log('regenerate requested')
  pending = true
  cycle()
  res.writeHead(202)
  res.end()
}

const sameSecret = (given) => {
  const a = Buffer.from(String(given || ''))
  const b = Buffer.from(cacheSecret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

let quiet = null
const clearCache = (req, res) => {
  if (!cacheSecret || req.method !== 'POST') {
    return (distDir ? serveStatic : starting)(req, res)
  }
  if (!sameSecret(req.headers['x-druxt-secret'])) {
    req.resume()
    res.writeHead(401)
    return res.end()
  }
  let body = ''
  let overflow = false
  req.setEncoding('utf8')
  req.on('data', (chunk) => {
    if (overflow) return
    body += chunk
    if (body.length > 64 * 1024) {
      overflow = true
      body = ''
    }
  })
  req.on('end', () => {
    // A batch too big to keep names more than it lists: no tags at all
    // tells open pages everything changed, so none keeps a stale part.
    const tags = overflow
      ? []
      : body
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => /^[\w:.-]{1,128}$/.test(tag))
    res.writeHead(204)
    res.end()
    // A sign-in purges its tokens' tags too; that is not a content change.
    if (tags.length && tags.every((tag) => BOOKKEEPING.test(tag))) return
    live.contentChanged(tags)
    // Purge sends one request per batch; an editor saving again restarts the
    // wait, so a run of saves costs one build.
    clearTimeout(quiet)
    quiet = setTimeout(() => {
      log('content changed; rebuilding')
      pending = true
      cycle()
    }, quietPeriod)
  })
}

/** Tags Drupal purges that no page shows: sign-in tokens and consumers. */
const BOOKKEEPING = /^(oauth2_token|consumer|session)(_list)?(:|$)/
/** The body of a request, as text, capped so a stray upload cannot fill memory. */
const readBody = (req, limit = 64 * 1024) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > limit) {
        reject(new Error('body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })

/**
 * The route druxt-auth's password grant posts to. Under `nuxt dev` the
 * module serves it; here the generated site has no Nuxt server, so this
 * does the same: the credentials go on to Drupal's token endpoint with the
 * consumer's id, and the answer comes back as it is.
 */
const GRANT_FIELDS = {
  password: ['username', 'password', 'scope'],
  refresh_token: ['refresh_token', 'scope'],
}
const passwordToken = async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' })
    return res.end()
  }
  let data
  try {
    data = JSON.parse((await readBody(req)) || '{}')
  } catch (error) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ message: 'Malformed request' }))
  }
  const fields = GRANT_FIELDS[data.grant_type]
  if (
    !fields ||
    (data.grant_type === 'password' && !(data.username && data.password))
  ) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ message: 'Invalid username or password' }))
  }
  const form = new URLSearchParams({
    ...Object.fromEntries(
      fields.filter((f) => data[f] !== undefined).map((f) => [f, data[f]])
    ),
    grant_type: data.grant_type,
    client_id: env.OAUTH_CLIENT_ID || 'umami_druxt',
    ...(env.OAUTH_CLIENT_SECRET
      ? { client_secret: env.OAUTH_CLIENT_SECRET }
      : {}),
  }).toString()
  const url = new URL('/oauth/token', drupalUrl)
  const upstream = http.request(
    url,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(form),
      },
      timeout: 30000,
    },
    (answer) => {
      res.writeHead(answer.statusCode, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      })
      answer.pipe(res)
    }
  )
  upstream.on('timeout', () => upstream.destroy(new Error('timeout')))
  upstream.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'Drupal did not answer' }))
  })
  upstream.end(form)
}

const drupal = createDrupalProxy(drupalUrl)
const server = http.createServer((req, res) => {
  if (isDrupalPath(req.url)) return drupal(req, res)
  if (req.url === '/_regenerate') return regenerate(req, res)
  if (req.url === '/_druxt/cache/clear') return clearCache(req, res)
  if (req.url === '/_auth/drupal-password/token') return passwordToken(req, res)
  // Once a build serves, the starting page's status poll must fail, so the
  // page reloads into the site instead of reading the fallback page as JSON.
  if (distDir && req.url.split('?')[0] === '/__status') {
    res.writeHead(404)
    return res.end()
  }
  return (distDir ? serveStatic : starting)(req, res)
})

// Live updates on /_live: open pages refresh when Drupal purges.
const live = attachSockets(server, { path: '/_live', drupalUrl, log })

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

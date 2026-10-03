/**
 * What the start scripts need from Drupal: a readiness check, and a proxy
 * that hands Drupal's paths to it from the frontend's own origin.
 */
const http = require('http')
const https = require('https')

// Paths Drupal answers, with or without a language prefix.
const DRUPAL_PATH =
  /^\/(?:(?:en|es)\/)?(?:jsonapi|router\/translate-path|js-search|oauth|sites\/default\/files|core|druxt-umami)(?:[/?]|$)/

/**
 * Whether a request path belongs to Drupal.
 *
 * @param {string} url - The request URL.
 * @returns {boolean} True for a Drupal path.
 */
const isDrupalPath = (url) => DRUPAL_PATH.test(url)

/**
 * GET a URL and parse a 200 response's JSON body.
 *
 * @param {string} url - The URL.
 * @returns {Promise<object|null>} The body, or null for any other outcome.
 */
const getJson = (url) =>
  new Promise((resolve) => {
    const target = new URL(url)
    const client = target.protocol === 'https:' ? https : http
    const req = client.get(
      target,
      { headers: { Accept: 'application/vnd.api+json' }, timeout: 10000 },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          try {
            resolve(res.statusCode === 200 ? JSON.parse(body) : null)
          } catch (e) {
            resolve(null)
          }
        })
      }
    )
    req.on('timeout', () => req.destroy())
    req.on('error', () => resolve(null))
  })

/**
 * Whether Drupal is provisioned: JSON:API answers, not merely a 200 holding
 * page, and the search index has files, which provisioning builds last.
 *
 * @param {string} baseUrl - Drupal's base URL.
 * @returns {Promise<boolean>} True once both answer.
 */
const drupalReady = async (baseUrl) => {
  const index = await getJson(new URL('/en/jsonapi', baseUrl).href)
  if (!index || !index.jsonapi) return false
  const search = await getJson(new URL('/js-search/settings', baseUrl).href)
  return Object.values((search && search.servers) || {}).some((server) =>
    Object.values(server.indexes || {}).some(
      (index) => (index.fileList || []).length
    )
  )
}

/**
 * Wait until Drupal is ready, logging once a minute until it is.
 *
 * @param {string} baseUrl - Drupal's base URL.
 * @param {Function} log - Logs a line.
 * @returns {Promise<void>} Resolves when Drupal is ready.
 */
const waitForDrupal = async (baseUrl, log) => {
  const started = Date.now()
  let logged = 0
  while (!(await drupalReady(baseUrl))) {
    if (Date.now() - logged >= 60000) {
      const waited = Math.round((Date.now() - started) / 1000)
      log(`waiting for Drupal at ${baseUrl} (${waited}s)`)
      logged = Date.now()
    }
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
}

/**
 * A request listener that streams a request to Drupal and the answer back.
 * The Host and forwarded headers pass through, so Drupal's links name the
 * origin the visitor asked for.
 *
 * @param {string} baseUrl - Drupal's base URL.
 * @returns {Function} The request listener.
 */
// Headers that describe one connection, not the message, so never forwarded.
const HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'upgrade',
]
const endToEnd = (headers) => {
  const out = { ...headers }
  for (const name of HOP_BY_HOP) delete out[name]
  return out
}

const createDrupalProxy = (baseUrl) => {
  const target = new URL(baseUrl)
  const client = target.protocol === 'https:' ? https : http
  return (req, res) => {
    const upstream = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        method: req.method,
        path: req.url,
        headers: endToEnd(req.headers),
        timeout: 60000,
      },
      (answer) => {
        res.writeHead(answer.statusCode, endToEnd(answer.headers))
        answer.pipe(res)
      }
    )
    upstream.on('timeout', () => upstream.destroy())
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502)
      res.end()
    })
    req.pipe(upstream)
  }
}

module.exports = { createDrupalProxy, isDrupalPath, waitForDrupal }

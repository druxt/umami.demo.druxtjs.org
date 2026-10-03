/**
 * Preloaded into `nuxt generate` by the start script. Requests for the site's
 * public origin go to the start script's own port instead, under the public
 * Host, so the build reads this container's Drupal while every URL Drupal
 * writes, and every URL the build bakes in, names the public origin.
 */
const http = require('http')
const https = require('https')

const origin = new URL(process.env.LOOPBACK_ORIGIN)
const port = Number(process.env.LOOPBACK_PORT)
const originPort = origin.port || (origin.protocol === 'https:' ? '443' : '80')
const request = { http: http.request, https: https.request }

/**
 * Normalize request arguments to one options object and a callback.
 *
 * @param {Array} args - The arguments given to request().
 * @returns {Array} The options and the callback.
 */
const normalize = (args) => {
  let [input, options, callback] = args
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  if (typeof input === 'string' || input instanceof URL) {
    const url = new URL(input)
    input = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
    }
  } else {
    options = {}
  }
  return [{ ...input, ...options }, callback]
}

const patch = (scheme) => {
  const original = request[scheme]
  const patched = function (...args) {
    const [options, callback] = normalize(args)
    const hostname =
      options.hostname || String(options.host || '').split(':')[0]
    const protocol = options.protocol || `${scheme}:`
    const target = String(options.port || (protocol === 'https:' ? 443 : 80))
    if (hostname !== origin.hostname || target !== originPort) {
      return original.apply(this, args)
    }
    const headers = {
      ...options.headers,
      host: origin.host,
      'x-forwarded-host': origin.host,
      'x-forwarded-proto': origin.protocol.slice(0, -1),
    }
    return request.http(
      {
        ...options,
        protocol: 'http:',
        hostname: '127.0.0.1',
        host: undefined,
        port,
        agent: undefined,
        headers,
      },
      callback
    )
  }
  const module = scheme === 'https' ? https : http
  module.request = patched
  module.get = (...args) => {
    const req = patched(...args)
    req.end()
    return req
  }
}

patch('http')
patch('https')

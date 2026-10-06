/**
 * The server half: a WebSocket beside the site, on the Node HTTP server it
 * already runs.
 *
 * `attachSockets(server, options)` answers the server's upgrade requests for
 * `options.path` and returns `contentChanged(tags)`, which tells every open
 * page what Drupal purged. `purgeHandler(sockets, { secret })` is the request
 * handler Purge's HTTP purger posts those tags to.
 */
const http = require('http')
const https = require('https')
const { WebSocketServer } = require('ws')
const { createHub } = require('./hub')

const DEFAULT_PATH = '/_sockets'

/** The sockets attached last, for the purge endpoint under `nuxt dev`. */
let current = null

/** The account a token belongs to, from Drupal's userinfo, or null. */
const whoIs = (drupalUrl, token, { request } = {}) =>
  new Promise((resolve) => {
    if (!drupalUrl || typeof token !== 'string') return resolve(null)
    if (!/^[\w.-]{20,4096}$/.test(token)) return resolve(null)
    const url = new URL('/oauth/userinfo', drupalUrl)
    const send =
      request || (url.protocol === 'https:' ? https.request : http.request)
    const req = send(
      url,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: 10000,
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          try {
            const data = JSON.parse(body)
            resolve(res.statusCode === 200 && data.sub ? data : null)
          } catch (e) {
            resolve(null)
          }
        })
      }
    )
    req.on('timeout', () => req.destroy())
    req.on('error', () => resolve(null))
    req.end()
  })

/**
 * Attach to an HTTP server. `handlers` maps channel kinds to handlers (see
 * the hub); `drupalUrl` is where an editor's token is checked.
 */
/**
 * The address a connection comes from: the first hop a proxy names, else the
 * socket's own. Behind Lagoon's router every socket is the router's.
 */
const addressOf = (req) =>
  String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim() ||
  (req.socket || {}).remoteAddress ||
  ''

/**
 * Attach to an HTTP server. `handlers` maps channel kinds to handlers (see
 * the hub); `drupalUrl` is where an editor's token is checked. The limits
 * keep one visitor from holding the server: sockets per address, messages
 * per second per socket, and sign-in checks per minute per socket.
 */
function attachSockets(
  server,
  {
    path = DEFAULT_PATH,
    drupalUrl,
    handlers = {},
    log = () => {},
    whoIs: who = whoIs,
    heartbeatMs = 30000,
    maxPerAddress = 20,
    messagesPerSecond = 20,
    checksPerMinute = 5,
    address = addressOf,
    now = Date.now,
  } = {}
) {
  const hub = createHub({ handlers })
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 })
  const perAddress = new Map()

  /** A token bucket: `rate` a second, twice that in a burst. */
  const bucket = (rate, per = 1000) => {
    let tokens = rate * 2
    let at = now()
    return () => {
      const t = now()
      tokens = Math.min(rate * 2, tokens + ((t - at) / per) * rate)
      at = t
      if (tokens < 1) return false
      tokens--
      return true
    }
  }

  const onUpgrade = (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname !== path) return
    const from = address(req)
    if ((perAddress.get(from) || 0) >= maxPerAddress) {
      socket.end('HTTP/1.1 429 Too Many Requests\r\n\r\n')
      return
    }
    perAddress.set(from, (perAddress.get(from) || 0) + 1)
    wss.handleUpgrade(req, socket, head, (ws) => {
      const sendFn = (data) => ws.readyState === 1 && ws.send(data)
      const client = hub.connect(sendFn, {
        resume: url.searchParams.get('resume') || undefined,
      })
      const allowMessage = bucket(messagesPerSecond)
      const allowCheck = bucket(checksPerMinute / 2, 60000)
      let dropped = 0
      // The last token checked and its answer: a repeat costs Drupal nothing.
      let checked = { token: undefined, account: null }
      ws.isAlive = true
      ws.on('pong', () => {
        ws.isAlive = true
      })
      ws.on('message', (data) => {
        if (!allowMessage()) {
          // A socket that keeps flooding is closed: policy violation.
          if (++dropped > 50) ws.close(1008, 'Too many messages')
          return
        }
        const raw = String(data)
        // The one message the hub does not take: a sign-in to check.
        if (raw.startsWith('{"type":"auth"')) {
          let token
          try {
            token = JSON.parse(raw).payload.token
          } catch (e) {
            token = null
          }
          const identify = (account) =>
            hub.identify(
              client,
              account
                ? {
                    name: account.preferred_username || account.name,
                    signedIn: true,
                  }
                : { signedIn: false }
            )
          if (token === checked.token) return identify(checked.account)
          if (!allowCheck()) return
          return who(drupalUrl, token).then((account) => {
            checked = { token, account }
            identify(account)
          })
        }
        hub.receive(client, raw)
      })
      ws.on('close', () => {
        const left = (perAddress.get(from) || 1) - 1
        if (left > 0) perAddress.set(from, left)
        else perAddress.delete(from)
        hub.disconnect(client, sendFn)
      })
      ws.on('error', () => {})
    })
  }
  server.on('upgrade', onUpgrade)

  // A socket that stops answering pings is closed, so its presence goes.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate()
        continue
      }
      ws.isAlive = false
      ws.ping()
    }
  }, heartbeatMs)
  if (heartbeat.unref) heartbeat.unref()

  const sockets = {
    hub,
    path,
    /** Drupal purged these cache tags: every open page hears about it. */
    contentChanged(tags = []) {
      hub.everyone('content:changed', {
        tags: tags.slice(0, 500),
        at: Date.now(),
      })
    },
    /** Stop answering: close every socket and let the server go. */
    close() {
      clearInterval(heartbeat)
      server.off('upgrade', onUpgrade)
      for (const ws of wss.clients) ws.terminate()
      wss.close()
      if (current === sockets) current = null
    },
  }
  server.on('close', sockets.close)
  current = sockets
  log(`sockets on ${path}`)
  return sockets
}

/** Cache tags from a purge's body: comma separated, or one per line. */
const readTags = (body) =>
  String(body || '')
    .split(/[,\s]+/)
    .map((tag) => tag.trim())
    .filter((tag) => /^[\w.:-]{1,255}$/.test(tag))

/**
 * A request handler for Purge's HTTP purger: `POST` with the shared secret in
 * `X-Druxt-Sockets-Secret` and the invalidated tags as the body. `sockets` is
 * an attached instance, or a function returning one. Tags matching `ignore`
 * (Drupal's bookkeeping: tokens, sessions) are dropped before anyone hears.
 */
function purgeHandler(sockets, { secret, ignore } = {}) {
  return (req, res) => {
    const reply = (status) => {
      res.statusCode = status
      res.end()
    }
    if (req.method !== 'POST') return reply(405)
    if (!secret || req.headers['x-druxt-sockets-secret'] !== secret)
      return reply(403)
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 256 * 1024) req.destroy()
    })
    req.on('end', () => {
      const target = typeof sockets === 'function' ? sockets() : sockets
      if (!target) return reply(503)
      const tags = readTags(body).filter((tag) => !(ignore && ignore.test(tag)))
      if (tags.length) target.contentChanged(tags)
      reply(204)
    })
  }
}

module.exports = {
  attachSockets,
  purgeHandler,
  readTags,
  whoIs,
  addressOf,
  current: () => current,
  DEFAULT_PATH,
}

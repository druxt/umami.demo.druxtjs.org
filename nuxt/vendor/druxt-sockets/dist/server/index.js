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
function attachSockets(
  server,
  {
    path = DEFAULT_PATH,
    drupalUrl,
    handlers = {},
    log = () => {},
    whoIs: who = whoIs,
    heartbeatMs = 30000,
  } = {}
) {
  const hub = createHub({ handlers })
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 })

  const onUpgrade = (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname !== path) return
    wss.handleUpgrade(req, socket, head, (ws) => {
      const sendFn = (data) => ws.readyState === 1 && ws.send(data)
      const client = hub.connect(sendFn, {
        resume: url.searchParams.get('resume') || undefined,
      })
      ws.isAlive = true
      ws.on('pong', () => {
        ws.isAlive = true
      })
      ws.on('message', (data) => {
        const raw = String(data)
        // The one message the hub does not take: a sign-in to check.
        if (raw.startsWith('{"type":"auth"')) {
          let token
          try {
            token = JSON.parse(raw).payload.token
          } catch (e) {
            token = null
          }
          return who(drupalUrl, token).then((account) =>
            hub.identify(
              client,
              account
                ? {
                    name: account.preferred_username || account.name,
                    signedIn: true,
                  }
                : { signedIn: false }
            )
          )
        }
        hub.receive(client, raw)
      })
      ws.on('close', () => hub.disconnect(client, sendFn))
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
  current: () => current,
  DEFAULT_PATH,
}

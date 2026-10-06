/**
 * CI: a purge reaches an open page. Opens the /_live socket, posts a sign-in's
 * purge, which no page hears, then a content purge, which must arrive with
 * its tags, then one too big to keep, which must arrive as everything.
 * Usage: node server/check-live.js <site origin> <cache secret>
 */
const http = require('http')
const path = require('path')
const WebSocket = require(require.resolve('ws', {
  paths: [path.dirname(require.resolve('@druxt-contrib/sockets/server'))],
}))

const [site, secret] = process.argv.slice(2)
const fail = (message) => {
  process.stderr.write(`check-live: ${message}\n`)
  process.exit(1)
}
setTimeout(() => fail('no content change arrived within 10s'), 10000)

const purge = (body) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      `${site}/_druxt/cache/clear`,
      {
        method: 'POST',
        headers: { 'X-Druxt-Secret': secret, 'Content-Type': 'text/plain' },
      },
      (res) => {
        res.resume()
        res.statusCode === 204
          ? resolve()
          : reject(new Error(`purge answered ${res.statusCode}`))
      }
    )
    req.on('error', reject)
    req.end(body)
  })

let heard = false
const ws = new WebSocket(`${site.replace(/^http/, 'ws')}/_live`)
ws.on('error', (error) => fail(error.message))
ws.on('message', (data) => {
  const message = JSON.parse(data)
  if (message.type === 'hello') {
    purge('oauth2_token:1,session:1')
      .then(() => purge('node:1,node_list'))
      .catch((error) => fail(error.message))
  }
  if (message.type === 'content:changed') {
    const tags = message.payload.tags.join(',')
    if (!heard) {
      if (tags !== 'node:1,node_list') fail(`an open page heard ${tags}`)
      heard = true
      // Far past the 64 KiB the handler keeps.
      const big = Array.from({ length: 10000 }, (_, i) => `node:${i}`)
      return purge(big.join(',')).catch((error) => fail(error.message))
    }
    if (tags !== '') fail(`an oversized purge arrived as ${tags.slice(0, 40)}…`)
    process.stdout.write(
      'A purge reached an open page with its tags, and an oversized one as everything.\n'
    )
    process.exit(0)
  }
})

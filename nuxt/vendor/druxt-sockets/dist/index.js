const { join, resolve } = require('path')
const server = require('./server')

/** Drupal's bookkeeping tags: no page shows a token or a session. */
const BOOKKEEPING = /^(oauth2_token|consumer|session)(_list)?(:|$)/

/**
 * Nuxt 2 module: a WebSocket beside the site for live updates and presence.
 *
 * Under `nuxt dev` and `nuxt start` it attaches to Nuxt's own server. A site
 * that runs its own server calls `attachSockets` from
 * `@druxt-contrib/sockets/server` instead, and sets `server: false`.
 *
 * Options, from `sockets` in nuxt.config or the module's own:
 * - `path`: where the socket listens (`/_sockets`); the purge endpoint is
 *   `<path>/purge`.
 * - `handlers`: a file exporting `(options) => ({ kind: handler })`, for
 *   channels of the site's own.
 * - `drupalUrl`: where an editor's token is checked; `baseUrl` from the druxt
 *   options by default.
 * - `secret`: the purge endpoint's shared secret, else
 *   `DRUXT_SOCKETS_SECRET`. No secret, no endpoint.
 * - `refresh`: refetch what a page shows of a purge (true).
 * - `server`: attach to Nuxt's server (true).
 */
function DruxtSocketsModule(moduleOptions = {}) {
  const options = {
    path: server.DEFAULT_PATH,
    refresh: true,
    server: true,
    ...(this.options.sockets || {}),
    ...moduleOptions,
  }
  const drupalUrl =
    options.drupalUrl || (this.options.druxt || {}).baseUrl || undefined
  const secret = options.secret || process.env.DRUXT_SOCKETS_SECRET

  this.options.build.transpile = this.options.build.transpile || []
  if (!this.options.build.transpile.includes('@druxt-contrib/sockets')) {
    this.options.build.transpile.push('@druxt-contrib/sockets')
  }

  this.addPlugin({
    src: resolve(__dirname, '../templates/plugin.js'),
    fileName: 'druxt-sockets/plugin.js',
    mode: 'client',
    options: {
      // By path: webpack 4 ignores the package's `exports` map.
      client: resolve(__dirname, 'runtime/client.js'),
      path: options.path,
      refresh: options.refresh,
    },
  })

  this.nuxt.hook('components:dirs', (dirs) => {
    dirs.push({ path: join(__dirname, 'components') })
  })

  if (!options.server) return

  if (secret) {
    this.addServerMiddleware({
      path: `${options.path}/purge`,
      handler: server.purgeHandler(server.current, {
        secret,
        ignore: options.ignore || BOOKKEEPING,
      }),
    })
  }

  this.nuxt.hook('listen', (http) => {
    let handlers = {}
    if (options.handlers) {
      const file = this.nuxt.resolver.resolvePath(options.handlers)
      const factory = require(file)
      handlers = (factory.default || factory)({ drupalUrl })
    }
    server.attachSockets(http, {
      path: options.path,
      drupalUrl,
      handlers,
      log: (message) => process.stdout.write(`druxt-sockets: ${message}\n`),
    })
  })
}

module.exports = DruxtSocketsModule
module.exports.BOOKKEEPING = BOOKKEEPING
module.exports.meta = require('../package.json')

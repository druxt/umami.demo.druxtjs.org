# @druxt-contrib/sockets

Live updates for Druxt over a WebSocket. A save in Drupal reaches every open
page within a second, a page knows who else has it open, and a site adds
channels of its own, such as a room people move through together.

The Drupal side is stock contrib: [Purge](https://www.drupal.org/project/purge)
and its [Generic HTTP Purger](https://www.drupal.org/project/purge_purger_http),
sending invalidated cache tags to the site. Signed-in editors are identified
through [Simple OAuth](https://www.drupal.org/project/simple_oauth)'s userinfo
endpoint.

## Install

```sh
npm install @druxt-contrib/sockets
```

```js
// nuxt.config.js
export default {
  modules: ['druxt', '@druxt-contrib/sockets'],
  sockets: {
    // Optional: channels of the site's own.
    handlers: '~/server/sockets.js',
  },
}
```

Register it under `modules`, not `buildModules`: it attaches to the server
that `nuxt start` runs, as well as the one `nuxt dev` runs.

## Live updates

When Drupal purges, every open page hears which cache tags changed. The
browser flushes those entities from the Druxt store and refetches the
`DruxtEntity`, `DruxtView` and `DruxtMenu` components that show them. An
entity form that is open keeps what the editor is typing.

Point Drupal at the site:

1. Enable Purge, Purge Tokens, Purge Queuer Core Tags, Purge Processor Late
   Runtime and Generic HTTP Purger.
2. Add an HTTP Bundled Purger for tag invalidations, posting to
   `https://<site>/_sockets/purge`.
3. Give it a header `X-Druxt-Sockets-Secret` with the secret, and the body
   `[invalidations:separated_comma]`, as `text/plain`.
4. Start the site with the same secret in `DRUXT_SOCKETS_SECRET`.

Drupal's bookkeeping tags, for tokens, consumers and sessions, are dropped
before any page hears of them. Set `ignore` to a regular expression to change
which.

A site can stop an entity from refetching, such as while it holds an
unsaved draft:

```js
// plugins/drafts.client.js
export default ({ $sockets, store }) => {
  $sockets.hold((type, uuid) => !!store.state.drafts[`${type}:${uuid}`])
}
```

## Presence

`DruxtPresence` joins the channel for the current route and shows how many
people have the page open, a note while someone else edits it, and a flash
when Drupal's change arrives.

```vue
<DruxtPresence :role="editing ? 'editor' : 'reader'" />
```

Its default slot takes over the markup, with `{ people, editor, updated }`.
Only a signed-in editor's `editor` role counts: the server checks their token
with Drupal.

## Channels of your own

A handlers file exports a function that returns a handler for each channel
kind. A channel is `kind:key`; the server refuses any kind without a handler,
apart from `page`.

```js
// server/sockets.js
module.exports = ({ drupalUrl }) => ({
  room: {
    join(hub, channel, client) {
      hub.send(client, 'welcome', channel, { name: client.name })
    },
    message(hub, channel, client, type, payload) {
      if (type === 'wave') hub.broadcast(channel, 'wave', { from: client.name })
    },
  },
})
```

A handler may have `join`, `leave`, `resume` and `message`, and each gets the
hub, which can `send` to one client, `broadcast` to a channel, and list a
channel's `members`. Validate every payload: it comes from the browser.

In the browser, `$sockets` carries the rest:

```js
this.$sockets.join('room:ABCD')
const off = this.$sockets.on('wave', ({ payload }) => console.log(payload.from))
this.$sockets.send('wave', 'room:ABCD')
```

A dropped socket reconnects with backoff and resumes as the same person for a
minute, channels and all.

## Your own server

A site that serves Nuxt from its own Node server attaches the sockets itself
and turns off the module's:

```js
const { attachSockets, purgeHandler } = require('@druxt-contrib/sockets/server')

const sockets = attachSockets(server, { drupalUrl, handlers })
const purge = purgeHandler(sockets, { secret: process.env.DRUXT_SOCKETS_SECRET })
// Route POST /_sockets/purge to `purge(req, res)`.
```

```js
// nuxt.config.js
sockets: {
  server: false
}
```

## Options

| Option      | Default                   |                                                                |
| ----------- | ------------------------- | -------------------------------------------------------------- |
| `path`      | `/_sockets`               | Where the socket listens; the purge endpoint is `<path>/purge` |
| `handlers`  | none                      | A file exporting `(options) => ({ kind: handler })`            |
| `drupalUrl` | `druxt.baseUrl`           | Where an editor's token is checked                             |
| `secret`    | `DRUXT_SOCKETS_SECRET`    | The purge endpoint's secret; without one there is no endpoint  |
| `ignore`    | Drupal's bookkeeping tags | Tags no page hears about                                       |
| `refresh`   | `true`                    | Refetch what a page shows of a purge                           |
| `server`    | `true`                    | Attach to the server Nuxt runs                                 |

State lives in one Node process. More than one needs a shared broker, which
this module does not provide.

This repository follows the Druxt repository standard, from
[module-template](https://github.com/druxt/module-template).

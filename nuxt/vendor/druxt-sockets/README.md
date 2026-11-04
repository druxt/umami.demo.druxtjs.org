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

## A channel on the page

`DruxtSockets` is a Druxt module for one channel of any kind, the current
page's by default.

```vue
<DruxtSockets :channel="`room:${code}`" />
```

Its theme component is found the Druxt way: `DruxtSocketsRoom` for a `room:`
channel, else `DruxtSocketsDefault`, from `components/druxt/sockets/`. It
receives these props, which `DruxtSocketsMixin` declares:

| Prop                  |                                                        |
| --------------------- | ------------------------------------------------------ |
| `channel`             | The channel, `kind:key`                                |
| `kind`, `channelKey`  | The parts either side of the first colon               |
| `mode`                | `reader` or `editor`, as given to the component        |
| `self`, `connected`   | This visitor's id, and whether the socket is open      |
| `people`              | Who is in the channel: `id`, `name`, `role`            |
| `messages`            | The latest payload of each message type on the channel |
| `send(type, payload)` | Sends a message on the channel                         |

```vue
<!-- components/druxt/sockets/Room.vue -->
<template>
  <button @click="send('wave', {})">{{ people.length }} here</button>
</template>

<script>
import { DruxtSocketsMixin } from '@druxt-contrib/sockets/mixins'
export default { mixins: [DruxtSocketsMixin] }
</script>
```

A default slot takes the same data instead:

```vue
<DruxtSockets channel="room:ABCD">
  <template #default="{ messages, send }">…</template>
</DruxtSockets>
```

Without either, it renders Druxt's debug output in development and nothing in
production.

## Presence

`DruxtPresence` is a `DruxtSockets` that passes on who is there and nothing
else: `channel`, `mode`, `self`, `people` and `editors`, everyone else with the
editor role. `DruxtPresenceMixin` declares them.

```vue
<DruxtPresence :mode="editing ? 'editor' : 'reader'" />
```

Its theme component is `DruxtPresencePage` for a `page:` channel, else
`DruxtPresenceDefault`, from `components/druxt/presence/`. Without one, it
lists who is here in a live status region. Only a signed-in editor's `editor`
mode counts: the server checks their token with Drupal.

The server announces presence on `page:` channels, and on a kind of your own
whose handler sets `presence: true`.

## The directive

`v-druxt-sockets` puts a channel on an element. Each of the channel's messages
arrives as a `druxt-sockets:<type>` event on the element, with the payload as
`detail`, and `data-druxt-sockets-connected` is set while the socket is open.
`v-druxt-sockets:send.<event>` sends each DOM event of that name as a message:
a form's fields for `submit`, without leaving the page, else the event's
`detail`.

```vue
<section v-druxt-sockets="`room:${code}`" @druxt-sockets:wave="onWave">
  <form v-druxt-sockets:send.submit="`room:${code}`">
    <input name="text" />
  </form>
</section>
```

`.editor` joins with the editor mode.

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

A handler may have `join`, `leave`, `resume` and `message`, and
`presence: true` for its channels to hear who is there. Each function gets the
hub, which can `send` to one client, `broadcast` to a channel, and list a
channel's `members`. Validate every payload: it comes from the browser.

In the browser, `$sockets` carries the rest:

```js
const off = this.$sockets.subscribe('room:ABCD', ({ type, payload }) => {
  if (type === 'wave') console.log(payload.from)
})
this.$sockets.send('wave', 'room:ABCD')
off()
```

Joins are counted per channel: a component, a directive and a page can share
one, and the server hears `leave` when the last of them ends. `join`, `leave`
and `on(type, fn)` work as well.

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
| `origin`    | the page's own            | Another origin for the socket; or `socketsOrigin` at runtime   |
| `handlers`  | none                      | A file exporting `(options) => ({ kind: handler })`            |
| `drupalUrl` | `druxt.baseUrl`           | Where an editor's token is checked                             |
| `secret`    | `DRUXT_SOCKETS_SECRET`    | The purge endpoint's secret; without one there is no endpoint  |
| `ignore`    | Drupal's bookkeeping tags | Tags no page hears about                                       |
| `refresh`   | `true`                    | Refetch what a page shows of a purge                           |
| `server`    | `true`                    | Attach to the server Nuxt runs                                 |

A socket that keeps sending past its rate is closed, and an address past its
socket limit is refused with a 429. A token already checked on a socket is
not checked with Drupal again. State lives in one Node process. More than one needs a shared broker, which
this module does not provide.

This repository follows the Druxt repository standard, from
[module-template](https://github.com/druxt/module-template).

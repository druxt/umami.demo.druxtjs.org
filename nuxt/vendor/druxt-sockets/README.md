# @druxt-contrib/sockets

Live updates for Druxt over a WebSocket. A save in Drupal reaches every open
page within a second, a page knows who else has it open, and a site adds
channels of its own, such as a room people move through together.

The Drupal side is stock contrib: [Purge](https://www.drupal.org/project/purge)
and its [Generic HTTP Purger](https://www.drupal.org/project/purge_purger_http),
sending invalidated cache tags to the site. Signed-in visitors are identified
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
| `activity`            | This visitor's activity, as given to the component     |
| `self`, `connected`   | This visitor's id, and whether the socket is open      |
| `people`              | Who is in the channel; see [Who is who](#who-is-who)   |
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
else: `channel`, `activity`, `self` and `people`. `DruxtPresenceMixin` declares
them.

```vue
<DruxtPresence :activity="editing ? 'editing' : ''" />
```

Its theme component is `DruxtPresencePage` for a `page:` channel, else
`DruxtPresenceDefault`, from `components/druxt/presence/`. Without one, it
lists the names of who is here in a live status region.

The server announces presence on `page:` channels, and on a kind of your own
whose handler sets `presence: true`.

## Who is who

The module classifies nobody and names nobody. Each person in `people` is
`{ id, name, signedIn, roles, activity }`:

- `name` is Drupal's for a signed-in visitor, `preferred_username` then
  `name`, and `null` for anyone else, unless the site's `name(user, client)`
  option says otherwise.
- `roles` are the Drupal roles from the userinfo claim `rolesClaim` names,
  `roles` by default. Drupal does not send that claim on its own; a site adds
  it, and lists it with Simple OAuth's claims, which keeps only those it names:

  ```php
  /**
   * Implements hook_simple_oauth_oidc_claims_alter().
   */
  function mysite_simple_oauth_oidc_claims_alter(array &$claim_values, array &$context) {
    $claim_values['roles'] = $context['account']->getRoles(TRUE);
  }
  ```

  ```yaml
  # services.yml: Simple OAuth's own list, and roles
  parameters:
    simple_oauth.openid.claims:
      - sub
      - name
      - preferred_username
      - email
      - email_verified
      - locale
      - profile
      - updated_at
      - zoneinfo
      - roles
  ```

- `activity` is what the page says the visitor is doing, such as `editing`:
  a short word, and a hint for display, never a permission. Drupal decides
  who may save.

Presence reaches each viewer through `describe(person, viewer)`. By default
an anonymous viewer sees no signed-in person's name and no roles, and a
signed-in viewer sees everything. A site's own `describe` returns what a
viewer may see of a person, or `null` to leave them out.

Handlers get the client's `user`, the userinfo, and its `roles`, to check
access by the site's own roles.

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

A modifier is the activity: `v-druxt-sockets.editing`.

## Channels of your own

A handlers file exports a function that returns a handler for each channel
kind. It is called with `drupalUrl` and `log`, the module's logger. A channel is `kind:key`; the server refuses any kind without a handler,
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
`presence: true` for its channels to hear who is there. With `retain: true`,
or a list of message types, the hub keeps the latest `broadcast` of each type
on a channel and sends it to whoever joins next, after the handler's `join`;
it forgets them when the channel empties. Each function gets the
hub, which can `send` to one client, `broadcast` to a channel, and list a
channel's `members`. A function may be async. One that throws or rejects is
logged, and the client hears an `error` on the channel. The server keeps running.
Validate every payload: it comes from the browser.

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

| Option       | Default                   |                                                                |
| ------------ | ------------------------- | -------------------------------------------------------------- |
| `path`       | `/_sockets`               | Where the socket listens; the purge endpoint is `<path>/purge` |
| `handlers`   | none                      | A file exporting `(options) => ({ kind: handler })`            |
| `drupalUrl`  | `druxt.baseUrl`           | Where a signed-in visitor's token is checked                   |
| `secret`     | `DRUXT_SOCKETS_SECRET`    | The purge endpoint's secret; without one there is no endpoint  |
| `ignore`     | Drupal's bookkeeping tags | Tags no page hears about                                       |
| `refresh`    | `true`                    | Refetch what a page shows of a purge                           |
| `server`     | `true`                    | Attach to the server Nuxt runs                                 |
| `name`       | Drupal's name, else none  | `(user, client) => name`, for every person                     |
| `rolesClaim` | `roles`                   | The userinfo claim with Drupal roles                           |
| `describe`   | as above                  | `(person, viewer) => person or null`, for each viewer          |
| `origins`    | any                       | Origins a socket may open from: a list or `(origin, req) =>`   |

A socket that keeps sending past its rate is closed, and an address past its
socket limit is refused with a 429. A token already checked on a socket is
not checked with Drupal again. State lives in one Node process. More than one needs a shared broker, which
this module does not provide.

This repository follows the Druxt repository standard, from
[module-template](https://github.com/druxt/module-template).

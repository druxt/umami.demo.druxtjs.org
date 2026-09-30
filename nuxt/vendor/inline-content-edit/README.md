# @druxt-contrib/inline-content-edit

Stages edits in the browser, previews them in place and sends them on when a
backend exists.

A Druxt site is built from a Drupal backend that may not be there when
someone reads it. This module lets an author keep working anyway. Edits are
held in the browser and shown on the page they belong to. Once a backend is
connected and the author has signed in, the edits are sent to it over
JSON:API. No part of that needs the backend to be up while the page loads.

## Install

```sh
npm install @druxt-contrib/inline-content-edit druxt-auth
```

druxt-auth is a peer dependency, like `vue`: the site installs it, so the
version and its own dependencies are the site's to choose and to audit. It is
marked optional only because `auth: false` leaves it out; every other site
needs it installed, and npm does not install an optional peer on its own.

Then add it to `modules` in `nuxt.config.js`, next to `druxt`:

```js
export default {
  modules: ['druxt', '@druxt-contrib/inline-content-edit'],
  druxt: {
    baseUrl: 'https://drupal.example.com',
    ice: {
      clientId: 'my-frontend',
    },
  },
}
```

`modules`, not `buildModules`: the module brings [druxt-auth][druxt-auth] in
for signing in, and druxt-auth registers runtime routes that `buildModules`
leave out of `nuxt start`. The order of the two modules does not matter. The
module turns the Vuex store on, so a site with no `store/` directory of its
own still gets one.

Do not list `druxt-auth` in `modules` as well. This module requires it with a
sign-in scheme that follows the backend chosen in the browser, and a site that
requires it first gets druxt-auth's own scheme, which is fixed at build time.
A site that brings its own sign-in sets `auth: false` and druxt-auth stays
out.

[druxt-auth]: https://www.npmjs.com/package/druxt-auth

## Options

Under `druxt.ice` in `nuxt.config.js`:

| Option                   | Default | What it does                                                                                               |
| ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------- |
| `clientId`               | `null`  | The client ID of the backend's OAuth consumer for this frontend. Signing in needs one; connecting does not |
| `sessionRecord.url`      | `''`    | Where a published session record is. Empty means no record is read                                         |
| `sessionRecord.tokenKey` | `null`  | The `sessionStorage` key holding a bearer token for reading the record. `null` reads it without one        |
| `destination`            | `null`  | Where the record is read from and where an export goes. `null` uses the default destination                |
| `auth`                   | `{}`    | Passed on to druxt-auth: `scope`, `login` and the rest of its options. `false` leaves druxt-auth out       |

A session record is a small JSON document, `{ url, clientId, expiresAt }`,
that something outside the site publishes when it starts a backend for a
while.

### Destinations

The module reads the record from its own URL and finds a token where
`sessionRecord.tokenKey` says one is. A site whose host offers something
better says so with a destination.

Point `druxt.ice.destination` at a module that default-exports one. A path
rather than an object: the options reach the plugin through `JSON.stringify`,
and an object of functions does not survive that. It would arrive empty, the
default would answer, and the site would look as though it had configured
nothing.

```js
// nuxt.config.js
druxt: {
  ice: {
    destination: '~/plugins/my-host-destination.js'
  }
}
```

```js
// ~/plugins/my-host-destination.js
import { defineDestination } from '@druxt-contrib/inline-content-edit'

export default defineDestination({
  id: 'my-host',

  // Where this destination's token lives. Leave it out to keep the default,
  // which reads `sessionRecord.tokenKey`.
  token(storage) { ... },

  // A better address than the plain URL, if there is one. Return nothing and
  // the plain URL is used, so a destination that only recognises some URLs
  // does not have to handle the rest.
  recordRequest(recordUrl, { token }) {
    return { url, headers }
  },

  // Send the staged cart somewhere that is not a Drupal backend.
  async export(cart, { token }) {
    return { ok: true, url }
  },
})
```

Every method is optional, and each absence has a defined meaning. A
destination with no `export` is one that never offers an export, rather than
one offering a control that fails when used. Anything a destination leaves
out falls back to the default, so a destination that does one thing is
normal.

`defineDestination` rejects an unknown method name rather than ignoring it,
because a typo is otherwise silent: the default answers and the site looks as
though it configured nothing.

## Editing

The module renders an anchor on every entity and field, so an overlay can
find any rendered box with one DOM query. `data-druxt-entity`,
`data-druxt-type` and `data-druxt-field` name the entity, its type and the
field. A field with more than one value also carries `data-druxt-delta`.

An adapter describes what a backend can do. Today the module includes a
plain fields adapter, for a backend with unstructured attributes.

A feature declares the adapter methods it needs, and does not appear at all
when the connected adapter lacks one of them. This is how one module serves
several backend shapes: a backend that supports block placement can add a
feature for it later, without changing anything for the sites that do not.

The drawer, the entity edit forms and the field widgets are not here yet.
Issue #2 tracks them.

## On a page

On the server, and at generate time, the `druxtIce` Vuex module is
registered, so the cart's shape is part of the generated payload. In the
browser the plugin then:

1. Holds every Druxt request until a backend is connected. A request made
   before that rejects with an error whose `isAuthoringHold` is `true`, and
   nothing is sent, so a page with no backend shows what the build gave it.
2. Brings back the cart the last visit staged, from `localStorage`, once the
   app is ready.
3. Shows staged entries on the page: content begun in the browser joins the
   Druxt store, and mounted entities and views pick the changes up.
4. Connects to whichever backend the URL query (`?backend=`), the last visit
   or the session record names, in that order, and points the Druxt client
   at it. The page's data is then read again from that backend.

None of the four needs a backend to be reachable. One that cannot be reached
is reported through `state.error`, the status goes to `error`, and the page
still renders.

## `this.$druxtIce`

Injected in the browser only. A component that may render on the server
reads it with a guard, as `DruxtIceStatus` does.

| Member                        | What it is                                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `options`                     | The resolved options                                                                                                                         |
| `state`                       | Reactive: `url`, `clientId`, `expiresAt`, `source`, `status`, `error`, `loginDialog`. `status` is `idle`, `checking`, `connected` or `error` |
| `connected`                   | `true` while `status` is `connected`                                                                                                         |
| `connect(url, source)`        | Check that `url` serves JSON:API, then connect to it. Resolves `true` or `false`, never rejects                                              |
| `disconnect()`                | Forget the backend, in memory and in storage                                                                                                 |
| `discover({ connect })`       | Read the session record and, when `connect` is true and nothing is connected, connect to what it names                                       |
| `connectPublished(record)`    | Connect to a record that has already been read                                                                                               |
| `openLogin()`, `closeLogin()` | Set `state.loginDialog`, for a dialog and the control that opens it that live in different places                                            |
| `auth`                        | Signing in, below                                                                                                                            |

`auth` is reactive too. It is a door onto druxt-auth, which holds the tokens,
renews them and exchanges the code on the way back from the backend:

| Member                              | What it is                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `token`, `account`, `authenticated` | The bearer token without its type, who it belongs to, and whether there is one                                                    |
| `login()`                           | Start druxt-auth's authorization code flow against the connected backend. The browser leaves for the backend's `/oauth/authorize` |
| `logout()`                          | Sign out of druxt-auth, and take the token off the Druxt client                                                                   |
| `applyToken()`                      | Put the token on the Druxt client's requests, or take it off. Done for you after each sign-in and sign-out                        |

The backend's consumer needs `<origin>/callback` as a redirect URI. druxt-auth
serves the page there and finishes the flow on it, then returns the author to
the page `login()` was called from. A site with a `/callback` page of its own
keeps it. The exchange happens before the page renders, which leaves the page
one thing to show: a refusal from the backend, in the `error` and
`error_description` query parameters.

druxt-auth fixes its endpoints at build time, and a site this module serves
may have no backend then. So the module registers its own sign-in scheme, a
subclass of druxt-auth's, which points the strategy at the connected backend
before each use, whether the browser is leaving for the backend, coming back
from it with a code or renewing the session. On the way back the plugin that
connects is still checking the backend, so the scheme reads the record the
plugin keeps in `localStorage` under `authoring.backend`. That record holds
the consumer's client id as well as the URL for the same reason.

nuxt/auth keeps the token and the refresh token in its own storage, under keys
named for the strategy, so `auth._token.drupal-authorization_code`.
`localStorage` holds the chosen backend, the cart and the editing flag, under
`authoring.backend`, `authoring.cart` and `authoring.editing`, so they survive
a reload. These names are the contract a site switching to this module relies
on.

## The cart

`this.$store` has a namespaced `druxtIce` module. Getters: `editing`,
`drawerOpen`, `count`, `isEmpty`, `resources`, `staged`, `stagedNew`,
`entryFor(type, id)`, `draftFor(type, id)`, `errorFor(type, id)`. Actions:
`restore`, `setEditing`, `setDrawerOpen`, `draftNew`, `stageNew`, `stage`,
`saveDraft`, `clearDraft`, `stageDraft`, `stageDeletion`, `unstage`,
`discardOne`, `discardIfUnreferenced`, `discardAll` and `commit`, which sends
everything staged to the backend in dependency order and reports each
result. The functions the store builds on, from the cart key to the PATCH
body, are exported from the package root for a site that needs them
directly.

## What is not here yet

This release is the engine, the store and the plugin. Further issues extend
it:

- Components: the editing drawer, the field forms and the sign-in dialog, so
  a site adds the module and gets the UI.
- Destination implementations. The interface is here and the default reads a
  record from its own URL, and the module comes with no destination that
  exports a cart yet.

## Example

`example/` is a Drupal 11 backend with `simple_oauth`, a PKCE consumer named
`druxt-ice-example` and CORS for the example's origin, and a Nuxt application
that shows the connection state. `npm run example:setup` builds it. The
generated site starts idle. `?backend=<url>` connects it.

## Commands

```sh
npm install          # dependencies, and enables the git hooks
npm run build        # siroc
npm test             # jest, coverage floor enforced
npm run lint         # every linter except prose
npm run lint:prose   # Vale, after `npm run lint:prose:install`
npm run example:setup
npm run example:dev
npm run test:e2e     # Playwright against the served output
```

## Licence

MIT.

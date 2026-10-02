<img src="https://github.com/druxt/druxt-auth/raw/0.x/.github/banner.svg" alt="druxt-auth, the authentication module for DruxtJS">

# DruxtAuth

[![npm](https://badgen.net/npm/v/druxt-auth)](https://www.npmjs.com/package/druxt-auth)
[![CI](https://github.com/druxt/druxt-auth/actions/workflows/ci.yml/badge.svg)](https://github.com/druxt/druxt-auth/actions/workflows/ci.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/druxt/druxt-auth/badge.svg?targetFile=package.json)](https://snyk.io/test/github/druxt/druxt-auth?targetFile=package.json)
[![codecov](https://codecov.io/gh/druxt/druxt-auth/branch/0.x/graph/badge.svg)](https://codecov.io/gh/druxt/druxt-auth)

> Druxt Authentication with Drupal Simple OAuth2 and nuxt/auth.

## Links

- DruxtJS: https://druxtjs.org
- Community Discord server: https://discord.druxtjs.org

## Install

`$ npm install druxt-auth`

### Nuxt.js

Add module to `nuxt.config.js`

```js
module.exports = {
  modules: [
    'druxt',
    [
      'druxt-auth',
      {
        clientId: '[DRUPAL_CONSUMER_CLIENT_ID]',
        // Only for the password grant, and only a confidential Consumer.
        clientSecret: '[DRUPAL_CONSUMER_SECRET]',
      },
    ],
  ],
  druxt: {
    baseUrl: 'https://demo-api.druxtjs.org',
  },
}
```

_Note:_ Use `modules`, not `buildModules`: this module registers the
authentication endpoints and proxy at runtime, and `buildModules` are not
loaded by `nuxt start`, so authentication would silently stop working in
production while the dev server looks fine.

_Note:_ replace `[DRUPAL_CONSUMER_CLIENT_ID]` and `[DRUPAL_CONSUMER_SECRET]` with the details from the consumer created in the following step. With Simple OAuth 6 this is the consumer's **Client ID** field, not its UUID.

### Drupal

1. Download, install and setup the [Simple OAuth module](https://www.drupal.org/project/simple_oauth).

2. **Simple OAuth 6.x only:** create an OAuth2 scope
   (`/admin/config/people/simple_oauth/oauth2_scope/dynamic`). Simple OAuth 6
   has no scopes configured, and it rejects every authorization request -
   with or without a `scope` parameter - until one exists that the request
   can resolve:

   - Grant types: enable **Authorization code**, and **Refresh token**
     too if you want sessions to renew. The refresh grant revalidates the
     scope it carries, so a scope without it fails renewal
   - Granularity: e.g. **Role** with the `authenticated` role

3. Create a Consumer depending on your desired authorization strategy:

   - **Authorization Code** grant:

     - Client ID: _a unique ID of your choosing - this is the `clientId`
       the frontend sends (Simple OAuth 6 looks consumers up by this
       field, not by UUID)_
     - New Secret: _leave this empty_
     - Is Confidential: _unchecked_
     - Use PKCE?: _checked_
     - Grant types: _enable **Authorization code** (and **Refresh token**
       for session renewal)_
     - Authorization code scopes: _the scope from the previous step. This
       is the default when the frontend does not send a scope of its own, which
       is what DruxtAuth does unless the `scope` option is set_
     - Redirect URI: `[FRONTEND_URL]/callback` (e.g., `http://localhost:3000/callback`)

   - **Password** grant:
     - New Secret: _provide a secure secret_
     - Is Confidential: _checked_
     - Redirect URI: `[FRONTEND_URL]/callback` (e.g., `http://localhost:3000/callback`)

4. **Authorization Code grant only:** give the role your users hold the
   **Grant OAuth2 codes** permission (`grant simple_oauth codes`). Without it
   the consent screen returns to itself with
   `The 'grant simple_oauth codes' permission is required.` and no login
   completes. User 1 bypasses permission checks, so test with a normal
   account.

## Usage

The DruxtAuth module installs and configures the **nuxt/auth** module for your Druxt site.

It adds two auth strategies that can be used via the `$auth` plugin:

- `drupal-authorization_code`

  ```js
  this.$nuxt.$auth.loginWith('drupal-authorization_code')
  ```

  With credentials, it signs in through Drupal's JSON login first, so the
  authorize step finds a session and returns without showing a Drupal page.
  `logout()` ends that Drupal session too, and `resetPassword()` asks Drupal
  to email a reset link:

  ```js
  await this.$auth.loginWith('drupal-authorization_code', {
    credentials: { name: '', pass: '' },
  })
  await this.$auth.strategy.resetPassword('editor@example.com')
  ```

  `resetPassword()` treats a value with an `@` as an address. A Drupal
  username may contain `@`, so name the field for those accounts:

  ```js
  await this.$auth.strategy.resetPassword('editor@example.com', 'name')
  ```

  _Note:_ The session cookie must reach the authorize request, which needs
  the browser to see the login and the authorize step on one site:

  | Setup                                       | Credentials                                                                                                                                                                                                                                |
  | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | Nuxt server proxying Drupal, on any servers | Works, and `druxt: { proxy: { api: true } }` sets it up. The module proxies `/user/login`, `/user/logout`, `/user/password`, `/oauth/authorize`, `/oauth/token` and `/session/token`, and points the `authorization` endpoint at the site. |
  | Subdomains of one domain, no proxy          | Point the endpoints at Drupal's absolute URLs, and allow credentials for the frontend's origin in Drupal's CORS.                                                                                                                           |
  | Different domains, no proxy                 | Not supported: the session cookie would be a third-party cookie. Call `loginWith` without credentials, which redirects to Drupal's login page as before.                                                                                   |

  `/user/login` is proxied for POST alone, which is the verb Drupal's JSON
  login answers on. A GET reaches the frontend, so a login page at that path
  still renders.

  The Consumer must approve automatically, or the authorize step shows
  Drupal's consent page.

  A Drupal session already open in the browser refuses these credentials,
  rather than signing the visitor in as whoever left it there. A session this
  module opened is ended and the sign in retried, so an abandoned
  authorisation does not lock anyone out. Any other session is refused, and
  the error has `sessionInUse` set so a form can say why.

  Drupal core cannot end a session it did not issue a logout token for. Add a
  route to the backend that can, point `sessionLogout` at it, and that session
  is ended instead of refused. Writing the route is the site's job:

  ```js
  auth: {
    strategies: {
      'drupal-authorization_code': {
        endpoints: {
          // The route, and the verb it answers on.
          sessionLogout: '/your/route',
          sessionLogoutMethod: 'post',
          // Where the CSRF token comes from. Core's own route, on every
          // Drupal. Set this to null for a route that takes no token.
          csrfToken: '/session/token',
        },
      },
    },
  }
  ```

  The module reads a token from `csrfToken` and sends it as `X-CSRF-Token`. A
  route protected the way core protects its writes requires that header, and
  answers 403 without it.

- `drupal-password`

  Simple OAuth 6 moved the password grant out of core. Install
  [simple_oauth_password_grant](https://www.drupal.org/project/simple_oauth_password_grant)
  on the backend and enable **Password** on the Consumer's grant types.

  ```js
  this.$nuxt.$auth.loginWith('drupal-password', {
    data: { username: '', password: '' },
  })
  ```

  The username and password reach Drupal through this module's own server
  route, so the site needs a server: SSR mode, or a static build with
  `createServerMiddleware()` mounted (see [Static builds](#static-builds)).
  Set `clientSecret` for a
  confidential Consumer. A public one needs none, and the request leaves it
  out rather than sending an empty value.

  A Consumer cannot be public and confidential at once, so a site running both
  this and the browser flow needs two: set `passwordClientId` to the second.

  The grant issues a token and no Drupal session, so Drupal's own pages stay
  anonymous under it, however signed in the frontend looks. A site that proxies
  those pages, for the admin UI or an editor's forms, sets `passwordSession`:

  ```js
  druxt: {
    auth: { clientId: '...', passwordClientId: '...', passwordSession: true },
    proxy: { api: true },
  }
  ```

  The sign-in then opens a Drupal session through the proxied `/user/login`
  with the same credentials, before the grant, and `logout()` ends both. It
  needs `/user/login` reaching Drupal on the site's origin, which the proxy
  provides. Off by default: a frontend that talks to the API alone has no use
  for the session or the request.

  With the session cookie in the browser, Drupal counts a write as cookie
  authenticated and refuses it without an `X-CSRF-Token` header. The module
  adds that header to the Druxt client's and the app's writes while a session
  is open, fetched from Drupal's `/session/token` on the site's origin, and
  fetches a fresh one when Drupal refuses the one sent.

- See the **nuxt/auth** documentation for more details: https://auth.nuxtjs.org/api/auth

## Sessions

Sessions renew on their own, with no application code. Both strategies store
a refresh token when the backend issues one, and **nuxt/auth** puts an
interceptor on the shared `$axios` instance: a request made with an expired
access token triggers a `refresh_token` grant first, then goes out with the
new token. That covers DruxtClient requests too, because Druxt shares the
same instance.

| Situation                                   | What happens                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Access token expires while the page is open | The next request refreshes it, silently                                                   |
| Page reloaded with an expired access token  | The tokens are in cookies, so the server render refreshes and the page hydrates logged in |
| Refresh token expired or rejected           | The session resets and the request is aborted with `ExpiredAuthSessionError`              |
| No refresh token stored                     | The request goes out with the expired token, and the backend refuses it                   |

Both of the following apply:

- The backend must issue refresh tokens: enable the **Refresh token** grant
  on both the consumer and the scope.
- **nuxt/auth** assumes a refresh token lives 30 days, because Simple OAuth's
  refresh tokens are opaque and carry no expiry to read. A consumer with a
  shorter lifetime (14 days is the usual default) rejects the refresh
  in between, which ends the session mid-request. Match the two, or expect
  a login prompt at the consumer's lifetime rather than at 30 days.
- Setting `druxt.axios` gives the DruxtClient its own axios instance, which
  the interceptor never sees. Attach the token yourself in that case.

## Static builds

The token route and the proxied Drupal paths are server middleware, which
`nuxt dev` and `nuxt start` run and a static build does not: its files are
served by something else. That server mounts the same routes from
`druxt-auth/server`, and the site signs in, sessions included, the way a
server-rendered one does:

```js
const http = require('http')
const { createServerMiddleware } = require('druxt-auth/server')

const auth = createServerMiddleware({
  baseUrl: process.env.DRUPAL_URL,
  clientId: process.env.DRUXT_AUTH_CLIENT_ID,
  clientSecret: process.env.DRUXT_AUTH_CLIENT_SECRET,
})

http.createServer((req, res) => auth(req, res, () => serveFiles(req, res)))
```

It answers `/_auth/drupal-password/token` and proxies the paths the module's
`proxy` option does: `/user/login`, `/user/logout` and `/user/password` for
POST, `/oauth/authorize`, `/oauth/token`, `/oauth/userinfo` and
`/session/token`. Anything else goes to `next`. `proxy: false` leaves the
proxying to the server. The entry is Node only, so it never reaches a browser
bundle. A static generate says so once, with a pointer here.

### Netlify and Vercel

On Netlify or Vercel there is nothing to mount. After a static generate the
module sees which platform the build runs on and writes the function itself:

| Platform | What the build writes                                                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Netlify  | A function per route group in `.netlify/v1/functions`, each routed by its own `config`, with the POST-only sign-in routes apart from the rest |
| Vercel   | `.vercel/output`, where the generated site becomes static files and the auth paths route to an edge function by method                        |

Each function is one self-contained file, so the platform deploys it without
the site's `node_modules`. The consumer's id is written in; its secret, where
it has one, is read from `DRUXT_AUTH_CLIENT_SECRET` when the function runs, so
set it in the platform's environment variables. `DRUXT_AUTH_BASE_URL`
overrides Drupal's address the same way. `druxt.auth.platform` names the
platform outright, `'netlify'` or `'vercel'`, or turns this off with `false`.

### Other hosts

A host that speaks the Fetch API, a Cloudflare Worker or a Deno server, takes
the same routes from `druxt-auth/fetch`, a handler from `Request` to
`Response` with no dependencies:

```js
import { createFetchHandler } from 'druxt-auth/fetch'

const auth = createFetchHandler({ baseUrl, clientId, clientSecret })

export default {
  fetch: (request) => auth(request),
}
```

It answers 404 for anything it does not route, so the host sends only the
auth paths to it.

## Logging out

`$auth.logout()` ends the frontend session and nothing else. Simple OAuth
does not serve a revocation endpoint, so the tokens it issued stay valid until they
expire, and the refresh token can still mint new access tokens for its whole
lifetime. Ending them at logout needs a revocation route on the Drupal side
([issue 2945273](https://www.drupal.org/project/simple_oauth/issues/2945273)
carries a patch), called through the Nuxt proxy so it shares the frontend
origin.

It also leaves its own storage keys behind, in both cookies and localStorage,
holding the string `"false"`. The keys are named for the strategy, so
`auth._token.drupal-authorization_code`, not `auth._token.druxt`.

`example/nuxt/pages/user/logout.vue` is a logout page that clears them and
forces a full page load, which is also what empties the DruxtStore of content
fetched while logged in.

## Signing in

The module adds a `/user/login` page with a sign in form:

```vue
<DruxtAuthLogin />
```

Put it wherever you like instead:

```vue
<DruxtAuthLogin redirect="/account" />
```

The form matches what the strategy can do. On the `drupal-authorization_code`
strategy it asks for a username and password and signs in without sending the
visitor to Drupal. On a strategy that cannot take credentials it renders a
button that starts the redirect instead.

The credentials form needs two conditions. Drupal must be
same origin with the frontend, because the session cookie has to reach
`/oauth/authorize`, so use the API proxy above. The Consumer must also have
**Automatically authorize this client** set, or Drupal shows its own consent
page and the visitor leaves the site.

The proxy and this page share the `/user/login` path and do not collide. The
module proxies that path for POST alone, which is what Drupal's JSON login
answers on, so a GET reaches this page.

A component that replaces the form receives the username and password, since
it renders the fields. Treat an override the way you would treat any code
handling a password.

### Replacing it

Add your own `pages/user/login.vue` and the module leaves the route alone,
so upgrading changes nothing for a site that already has a login page.

To theme the form rather than replace the page, add a component named after
the strategy, or `DruxtAuthLoginDefault` for all of them:

```vue
<!-- components/DruxtAuthLoginDrupalAuthorizationCode.vue -->
<template>
  <form @submit.prevent="submit">
    <p v-if="error">{{ error }}</p>
    <input v-model="credentials.name" />
    <input v-model="credentials.pass" type="password" />
    <button :disabled="busy">Sign in</button>
  </form>
</template>

<script>
export default {
  props: ['busy', 'capabilities', 'credentials', 'error', 'reset', 'submit', 'resetPassword'],
}
</script>
```

## Saving a user revokes their tokens

Drupal revokes a user's access tokens whenever that user is saved, so an
editor who saves their own profile would otherwise come back to a site that
thinks it is signed in and is refused every request.

The module handles this on its own, with no configuration: the refresh token
is untouched, so the next request refreshes and replays. Only a rapid burst of
saves outpaces the recovery, and the request after the burst recovers.

Upstream this is [drupal.org issue 2946882](https://www.drupal.org/i/2946882).

## Options

| Option             | Type               | Required | Default       | Description                                                                                                                                                                                                              |
| ------------------ | ------------------ | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `clientId`         | `string`           | Yes      | `undefined`   | The Drupal Consumer's **Client ID** field, not its UUID                                                                                                                                                                  |
| `passwordClientId` | `string`           | No       | `clientId`    | The Consumer the password grant authenticates as, when it differs from the browser flow's.                                                                                                                               |
| `clientSecret`     | `string`           | No       | `undefined`   | The Drupal Consumer API secret. The password grant sends it, and a public Consumer needs none.                                                                                                                           |
| `login`            | `string`/`boolean` | No       | `/user/login` | Where the sign in page goes. `false` leaves it out. A page the site already has always wins.                                                                                                                             |
| `scope`            | `array`            | No       | `undefined`   | The OAuth scopes to request. When unset, no `scope` parameter is sent and Simple OAuth 6 falls back to the consumer's own **Authorization code scopes** - so either set this option or configure scopes on the consumer. |

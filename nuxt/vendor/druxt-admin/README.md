# @druxt-contrib/admin

The admin slot for a Druxt site. On an admin route it renders a way through to
Drupal's administration pages. Everywhere else it renders nothing at all.

It is a socket rather than a feature. The default is a link out to the backend,
which is the only thing that works on every deployment with no configuration. A
richer frontend admin replaces it by passing content into the slot, and the
name of the replacement never reaches this module.

## Install

```bash
npm install @druxt-contrib/admin
```

```js
// nuxt.config.js
export default {
  buildModules: ['druxt', '@druxt-contrib/admin'],
  druxt: {
    baseUrl: 'https://example.com',
  },
}
```

Registering it as a bare string is the whole configuration. Everything below
covers the cases where the default is not enough.

## What counts as an admin route

Drupal's own paths, not a prefix of this module's invention: `/admin`,
`/node/add`, `/media/add` and the `/user` paths a site does not render itself.
A decoupled site that invents `/druxt-admin/...` ends up with two addresses for
one page and has to translate between them on every hop.

The match is segment aware, so `/administrators` is content and stays content.

A site that has moved Drupal's paths says so:

```js
druxt: {
  admin: {
    paths: ['/backend'],
  },
}
```

## Modes

| Mode    | What it does                                                 |
| ------- | ------------------------------------------------------------ |
| `link`  | Links out to the same path on the backend. The default       |
| `proxy` | For a deployment that serves Drupal's admin from this origin |

`link` is the default because a proxy means real deployment work in exchange
for erasing the cross-origin problems an iframe cannot. A site takes that on
knowingly:

```js
druxt: {
  admin: {
    mode: 'proxy',
  },
}
```

An unknown mode falls back to `link` rather than throwing. A typo should cost
a link out instead of the proxy, not the whole build.

## Replacing the default

```vue
<DruxtAdmin>
  <template #default="{ path, href, mode }">
    <MyAdminScreen :path="path" />
  </template>
</DruxtAdmin>
```

The slot is handed the path being judged, the backend address for it, and the
resolved mode.

## Without a backend

A static build that has never connected one has nowhere to send anybody, and
says so rather than rendering a link to nothing. The backend is read from the
live Druxt client rather than from build-time configuration, so a site that
connects one at runtime gets a working link without being rebuilt.

## The example application

`example/nuxt` loads the module and shows both states: a content route with
nothing of this module on it, and an admin route with the link. It has no
Drupal backend of its own, because this module needs none.

```bash
npm run build
npm run example:install
npm run example:dev    # http://localhost:3000
```

## Commands

```bash
npm install     # dependencies, and enables the git hooks
npm run build   # siroc, into dist/
npm test        # jest, coverage floor enforced
npm run lint    # eslint, prettier, markdownlint, cspell, private-host, knip
npm run test:e2e  # Playwright against the generated example
```

## Licence

[MIT](LICENSE)

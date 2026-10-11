# @druxt-contrib/ckeditor

Mounts Drupal's own CKEditor 5 build in a Druxt frontend.

Drupal builds CKEditor 5 as a set of DLL scripts under
`core/assets/vendor/ckeditor5`, one per package, and configures a toolbar per
text format. This module loads those scripts and reads that configuration
through the Druxt store. Then it mounts the editor on a field. Nothing from
`@ckeditor/*` is installed in the frontend, so the editor is the one the
site's authors already use, at the version the backend runs.

## Install

```sh
npm install @druxt-contrib/ckeditor
```

Then add it to `buildModules` in `nuxt.config.js`, next to `druxt`:

```js
export default {
  buildModules: ['druxt', '@druxt-contrib/ckeditor'],
  druxt: {
    baseUrl: 'https://drupal.example.com',
    ckeditor: {
      // Options, all optional.
    },
  },
}
```

The order of the two modules does not matter.

## Use

```vue
<template>
  <DruxtCkeditor v-model="body" format="basic_html" />
</template>
```

The component renders a `<textarea>` bound to `v-model` until the editor is
created, and keeps it if the editor never is. It emits:

| Event   | When                                                                        |
| ------- | --------------------------------------------------------------------------- |
| `input` | The value changed, as the HTML Drupal would store                           |
| `ready` | The editor was created; the argument is the editor                          |
| `error` | The scripts did not load or the editor did not start; once, with the reason |
| `hold`  | An image was inserted with nowhere to send it; `{ file, dataUrl }`          |

Props:

| Prop             | Default      | What it does                                                            |
| ---------------- | ------------ | ----------------------------------------------------------------------- |
| `value`          | `''`         | The stored HTML                                                         |
| `format`         | `basic_html` | The Drupal text format, which picks the toolbar and the filters         |
| `upload`         | `null`       | `{ resourceType, field }` naming where an inserted image's bytes go     |
| `backendUrl`     | `null`       | The backend serving content files, when it is not the Druxt base URL    |
| `toolbar`        | `null`       | An explicit toolbar, which wins over every lookup                       |
| `filters`        | `null`       | The filters the format runs, which wins over every lookup               |
| `viewportOffset` | `0`          | How far down the page the editor treats as the top, for a pinned header |

## Options

Under `druxt.ckeditor` in `nuxt.config.js`:

| Option          | Default                                                      | What it does                                                                                    |
| --------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `scripts`       | `null`                                                       | Where the scripts are. `null` means the backend's own copy, under the Druxt base URL. See below |
| `copy`          | `false`                                                      | Serve the scripts from the site's own origin. See below                                         |
| `packages`      | the sixteen packages Drupal's toolbar vocabulary can ask for | The CKEditor packages to load, by Drupal's names                                                |
| `files`         | `{ from: '/sites/default/files/', to: null }`                | Where a body image's path is rewritten to for the editor. `null` means the backend's copy       |
| `toolbars`      | `{}`                                                         | A toolbar per format, used when Drupal's configuration cannot be read                           |
| `filters`       | `{}`                                                         | The filters per format, used when Drupal's configuration cannot be read                         |
| `image.toolbar` | alt text, caption, three styles                              | What a selected image offers                                                                    |
| `timeout`       | `15000`                                                      | Milliseconds to wait for each script                                                            |

Everything is also on `this.$druxtCkeditor`: `options`, `scripts()`,
`files()`, `backendUrl()` and `load()`, which resolves to the `CKEditor5`
namespace or `null`.

## Exports

The supported surface is the `DruxtCkeditor` component, the Nuxt module (the
package's default export), and the `$druxtCkeditor` plugin. The package also
exports the functions these are built from, so a built component can import
them by name. Those are internal: shared between this module's own files,
not an API to build against, and they can change in any release.

## Script sources

Three sources, and the difference is what happens when the backend is not
reachable from the browser.

1. **The backend**, the default. Scripts load from
   `<druxt.baseUrl>/core/assets/vendor/ckeditor5`. Nothing to install, and
   the editor is exactly Drupal's. The editor is a textarea whenever the
   backend is down, private, or not there at all.
2. **Another host.** Set `scripts` to a URL. The files there have to be in
   Drupal's layout: `<scripts>/ckeditor5-dll/ckeditor5-dll.js`, then
   `<scripts>/<package>/<package>.js`. A CDN, or a copy of the backend's
   directory on the frontend's own host.
3. **The site's own origin.** Set `copy`. The module serves the files at
   `/ckeditor5` during `nuxt dev` and `nuxt start`, and copies them into the
   output of `nuxt generate`, so a static site includes its own editor and
   works with no backend at all. `copy: true` reads the application's
   `node_modules`, so install the packages:

   ```sh
   npm install ckeditor5 @ckeditor/ckeditor5-editor-classic @ckeditor/ckeditor5-essentials ...
   ```

   one `@ckeditor/ckeditor5-<package>` per name in `packages`, at the version
   the backend's Drupal version includes. Drupal 11.2 includes CKEditor 5 v45;
   check `core/core.libraries.yml` on the backend. A string is a directory
   already in Drupal's layout, resolved against the application's root, such
   as a backend checkout's `web/core/assets/vendor/ckeditor5`, and needs
   nothing installed. A package that cannot be found is a warning at build
   time, naming the package, and the editor loads without it.

## What happens with no backend

The editor still mounts when the scripts come from somewhere else, and the
toolbar is still Drupal's when a page's `fetch()` dispatched
`druxt/getCollection` for `editor--editor` at generate time, because the
payload carries it. Reading `editor--editor` and
`filter_format--filter_format` needs both ticked in the Druxt module's
resource list on the backend, and `access druxt resources` for whoever asks.
Where they cannot be read, `toolbars` and `filters` in the options answer,
and after them the built-in toolbar. An inserted image is uploaded over
JSON:API through the Druxt client, which carries the signed-in session's
bearer token once a site adds the `druxt-auth` module. With no session the
image is held as a data URL and reported through `hold`, so nothing is lost.

## Example

`example/` is a Drupal 11 backend and a Nuxt application that mounts the
editor on `basic_html`, with `copy` pointing at the backend checkout so the
generated site doesn't need a backend. `npm run example:setup` builds it.

## Licence

MIT.

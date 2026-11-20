# Vendored packages

Packages the site needs before they are published to npm. Each directory is
the package's own `npm pack` output: `package.json`, `dist/` and `templates/`,
declared in `package.json` as a `file:` dependency so the built components can
import the package by name.

| Directory        | Package                         | Source                                                          |
| ---------------- | ------------------------------- | --------------------------------------------------------------- |
| `druxt-admin`    | `@druxt-contrib/admin` 0.0.0    | druxt-admin, branch `feature/operations-menu` at `f9b9c4a`      |
| `druxt-ckeditor` | `@druxt-contrib/ckeditor` 0.0.0 | druxt-ckeditor, branch `feature/1-ckeditor-module` at `dcbdaaf` |
| `druxt-diff`     | `@druxt-contrib/diff` 0.0.0     | druxt-diff, branch `feature/diff-host` at `740afdc`             |
| `druxt-sockets`  | `@druxt-contrib/sockets` 0.0.0  | a prerelease build, ahead of its first npm release              |

The admin, ckeditor and sockets copies drop the package's `postinstall`
script, which its `files` list leaves out, so a `file:` install would fail on
it. The ckeditor copy's fallback textarea takes an `aria-label` from the
attributes (`dist/components/DruxtCkeditor.vue`), so the field's name reaches
it before the editor is ready. The fix is reported upstream.
The sockets copy takes an `origin` for the socket, or `socketsOrigin` from the
public runtime config, so production can open it beside its CDN
(`dist/runtime/client.js`). That change goes upstream too.

Replace a directory with the npm release once one exists, and the `file:`
entry with a version.

## The Druxt pre-release build

`druxt-dev` holds tarballs, where the directories above hold unpacked
packages. They are a build of Druxt 0.25.2 before its release: druxt.js `0.x`
at `0dbf7f60` merged with the head of
[druxt/druxt.js#1042](https://github.com/druxt/druxt.js/pull/1042), packed
with the commands the druxt.js release workflow uses for its dev snapshot.
`package.json` names each tarball in its `resolutions`.

Once 0.25.2 is on npm, replace each `file:` entry with its version and delete
`druxt-dev`.

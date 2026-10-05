# Vendored packages

Packages the site needs before they are published to npm. Each directory is
the package's own `npm pack` output: `package.json`, `dist/` and `templates/`,
declared in `package.json` as a `file:` dependency so the built components can
import the package by name.

| Directory        | Package                         | Source                                                          |
| ---------------- | ------------------------------- | --------------------------------------------------------------- |
| `druxt-ckeditor` | `@druxt-contrib/ckeditor` 0.0.0 | druxt-ckeditor, branch `feature/1-ckeditor-module` at `dcbdaaf` |
| `druxt-sockets`  | `@druxt-contrib/sockets` 0.0.0  | a prerelease build, ahead of its first npm release              |

The `druxt-ckeditor` and `druxt-sockets` copies drop the package's `postinstall` script, which its
`files` list leaves out, so a `file:` install would fail on it.

Replace a directory with the npm release once one exists, and the `file:`
entry with a version.

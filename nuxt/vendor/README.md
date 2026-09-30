# Vendored packages

Packages the site needs before they are published to npm. Each directory is
the package's own `npm pack` output: `package.json`, `dist/` and `templates/`,
declared in `package.json` as a `file:` dependency so the built components can
import the package by name.

| Directory             | Package                                    | Source                                                                |
| --------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| `druxt-ckeditor`      | `@druxt-contrib/ckeditor` 0.0.0            | druxt-ckeditor, branch `feature/1-ckeditor-module` at `dcbdaaf`       |
| `inline-content-edit` | `@druxt-contrib/inline-content-edit` 0.0.0 | druxt-inline-content-edit, branch `feature/4-druxt-auth` at `8a98de2` |

Both copies drop the package's `postinstall` script, which its `files` list
leaves out, so a `file:` install would fail on it. The site uses the
inline-content-edit package as a library (its cart store and preview helpers),
not as a Nuxt module: the module would hold every request until a backend is
chosen in the browser, and this site's backend is fixed.

Replace a directory with the npm release once one exists, and the `file:`
entry with a version.

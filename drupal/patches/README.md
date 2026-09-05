# Patches

Local reworks of patches and merge requests still open upstream. Each one
should be pushed back to its issue and deleted from here.

## `druxt-3273228-views-route-langcode.patch`

Issue: [#3273228 Add langcode to Views Decoupled Router integration](https://www.drupal.org/project/druxt/issues/3273228)

Makes the Views decoupled-router integration resolve against the language in
the requested path, so a `/es` view route returns Spanish rather than the
site default. Without it a decoupled frontend sends `/es` straight back to `/`.

Rerolled here against **druxt 1.2.2**. 1.2.2 rewrote most of `ViewsPathTranslatorSubscriber`: `declare(strict_types=1)`,
`#[\Override]` and a `: void` return on `onPathTranslation`, non-capturing
`catch` clauses, the `CacheableJsonResponse` guard removed, and route
resolution moved from the route object to `ROUTE_NAME` plus
`array_intersect_key` parameters. The 1.2.0 and 1.2.1 versions of this patch
do not survive that, so this was hand-rerolled rather than fuzzed: applying
the older one lands hunks at fuzz 3 and one hunk fails outright.

The new helper is typed (`getPathLanguage(string $path): ?LanguageInterface`)
and uses `str_starts_with`, to match 1.2.2's own style rather than the Drupal 9
era code it came from.

**The copy in `druxt.js` at `docs/drupal/patches/` is still the 1.2.0 version**
and carries a live trap: 1.2.1 added the same `MethodNotAllowedException`
import the patch adds, so applying it there produces a duplicate import and a
file that will not parse. That copy and this one should not both exist; see
the ownership note on the umami MR.

## `druxt-mr8-node-preview.patch`

Issue: [#3264181 Node Preview](https://www.drupal.org/project/druxt/issues/3264181)
Merge request: [MR!8](https://git.drupalcode.org/project/druxt/-/merge_requests/8)

Adds the `druxt_node_preview` submodule: the routes, controller, settings form
and template that let Drupal's node-preview tab render through the decoupled
frontend. Still open upstream after four years, and the only source of the
module, so the demo carries it.

Rerolled against **druxt 1.2.2**, with three changes from the raw MR diff:

- The `composer.json` hunk is dropped. It only adds `drupal/jsonapi_node_preview`
  as a druxt dependency, which the site requires directly anyway, and patching a
  package's own `composer.json` after resolution changes nothing. It was also the
  one hunk that conflicted, because 1.2.1 widened its core constraint and bumped
  `jsonapi_views`.
- `druxt_node_preview.info.yml` was `^8.8 || ^9`, so the submodule would refuse
  to install on the version this demo runs. Set to `^10 || ^11 || ^12`, matching
  druxt 1.2.2's own constraint.
- The `druxt.info.yml` hunk is dropped. It renames the module from `DruxtJS` to
  `Druxt`, rewrites its description and adds `package: Web services`. None of
  that is node preview, and applying it in 2026 would undo naming 1.2.2 still
  carries.

This demo exists partly to prove these out so they can go upstream. When MR!8
lands, delete this file and the `jsonapi_node_preview` requires with it.

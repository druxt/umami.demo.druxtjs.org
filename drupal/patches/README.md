# Patches

Patches for issues still open upstream. Prefer pointing `composer.json` at the
merge request diff; a local file here means the upstream one does not apply to
the version this demo pins, and it should be pushed back and deleted.

## `druxt-3273228-views-route-langcode.patch`

Issue: [#3273228 Add langcode to Views Decoupled Router integration](https://www.drupal.org/project/druxt/issues/3273228)
Merge request: [MR!9](https://git.drupalcode.org/project/druxt/-/merge_requests/9)

**A verbatim snapshot of MR!9, not a reroll.** Upstream is the source of truth;
re-download it to resync, and delete this file when the merge request lands.

Taken at head `36b63420`, base `f71640a7`, against the `1.2.x` target.

It is a file rather than the merge request URL because `cweagans/composer-patches`
2.x records a hash of every patch in `patches.lock.json`. A merge request diff is
a moving target, so the build breaks the moment the branch is touched: pointing
composer at `merge_requests/9.diff` failed CI within twenty minutes of being
committed, when a README hunk was dropped upstream and the hash stopped matching.
GitLab has no immutable diff URL for a whole merge request either. `compare/<base>...<head>.diff`
returns an HTML page, and the branch has five commits so no single commit diff covers it.

The earlier local reroll of this issue is gone. MR!9 was rebased onto 1.2.2 and
is a superset of it: it strips the language prefix before matching the route,
restores the config override language in a `finally` so a shared language manager
is not left mutated, and reports the default langcode for an unprefixed path.

`JsonApiTest::testRouterResolvesViewInSpanish` is the end-to-end proof the merge
request's own kernel tests cannot give, since two of them skip because
`PathProcessorLanguage` is not wired in a kernel harness. Against a real site
`/es` resolves the frontpage view with `langcode: es` and the translated label
`Inicio`, while `/en/node` reports `en` and `Home`.

One gap found while proving it: `isHomePath` is `false` for `/es` but `true` for
`/` and `/en/node`, so a decoupled frontend will not treat the Spanish front page
as home. That belongs on the issue, not in this file.

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

## `decoupled_router-3111456-resolve-language-from-path.patch`

Issue: [#3111456 Resolve the language from the requested path](https://www.drupal.org/project/decoupled_router/issues/3111456)

Snapshot of the copy druxt.js carries, cut against **decoupled_router 2.0.5**,
which is the version this site pins.

Vendored rather than fetched from `raw.githubusercontent.com/.../develop/...`.
That URL is a branch, so the file behind it changes without the URL changing:
druxt.js is re-cutting this patch against 2.0.7, and the day that lands, a
build here would fetch a patch for a version it is not on and fail. Drop this
file and the pin together when the site moves to 2.0.7.

## `decoupled_router-3468825-mr20.patch`

Issue: [#3468825](https://www.drupal.org/project/decoupled_router/issues/3468825)
Merge request: [MR!20](https://git.drupalcode.org/project/decoupled_router/-/merge_requests/20)

Snapshot at head `a6ac1a8b`, base `be1af9cc`. Same reason as the others: a
merge request diff is regenerated on every push and composer-patches
hash-locks it. Reported as fixed upstream and expected to fail against 2.0.7,
so it should drop at that move.

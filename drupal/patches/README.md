# Patches

Upstream merge request diffs are referenced by URL, not copied here. The point
of carrying a patch is to exercise the upstream work on a real site and push it
to merge, and a local copy freezes a moment and stops tracking the branch. The
exit for every reference is the upstream merge.

The cost is known and accepted: a merge request diff regenerates on every push
to its branch, and `cweagans/composer-patches` 2.x records a hash of each patch
in `patches.lock.json`, so the next install fails with "Hash mismatch for patch
downloaded from ...". When that happens, run `composer patches-relock`, re-run
the suite (`.devtools/test`, which includes the Spanish view e2e), and carry
that evidence to the issue as the review case.

A file lives here only when no upstream URL can do the job. Both current ones
are that case, and both go away when their blocker does.

## `druxt-mr8-node-preview.patch`

Issue: [#3264181 Node Preview](https://www.drupal.org/project/druxt/issues/3264181)
Merge request: [MR!8](https://git.drupalcode.org/project/druxt/-/merge_requests/8)

Not a snapshot: the raw MR!8 diff does not apply to druxt 1.2.2. Verified,
`composer.json` hunk 2 fails and the whole patch is rejected. Three deliberate
differences from upstream:

- The `composer.json` hunk is dropped. It only adds `drupal/jsonapi_node_preview`
  as a druxt dependency, which this site requires directly anyway, and patching a
  package's own `composer.json` after resolution changes nothing. It is also the
  hunk that fails, because 1.2.1 widened its core constraint and bumped
  `jsonapi_views`.
- `druxt_node_preview.info.yml` was `^8.8 || ^9`, so the submodule refuses to
  install on the version this demo runs. Set to `^10 || ^11 || ^12`, matching
  druxt 1.2.2's own constraint.
- The `druxt.info.yml` hunk is dropped. It renames the module from `DruxtJS` to
  `Druxt`, rewrites its description and adds `package: Web services`, none of
  which is node preview.

Rerolling this against 1.2.2 upstream would let the reference become a URL like
the others. That is the fix, not copying less.

## `decoupled_router-3111456-resolve-language-from-path.patch`

Issue: [#3111456 Resolve the language from the requested path](https://www.drupal.org/project/decoupled_router/issues/3111456)
Merge request: [MR!35](https://git.drupalcode.org/project/decoupled_router/-/merge_requests/35)

No URL targets the version this site pins. MR!35 is cut against
**decoupled_router 2.0.7** and this site is pinned to **2.0.5**, held there
until [#3111456](https://www.drupal.org/project/decoupled_router/issues/3111456)
is rerolled. The only other copy, on druxt.js `develop`, is being re-cut for
2.0.7 as well, so referencing it would fetch a patch for a version this site is
not on.

Delete this file at the 2.0.7 move and reference MR!35's diff directly. The
same move drops [#3172926](https://www.drupal.org/project/decoupled_router/issues/3172926)
and [#3468825](https://www.drupal.org/project/decoupled_router/issues/3468825),
both reported fixed upstream and both expected to fail against 2.0.7.

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

A file lives here only when no upstream URL can do the job. The one current
file is that case, and it goes away when its blocker does.

`drupal/decoupled_router` is a source install (`config.preferred-install` in
`composer.json`). [MR!35](https://git.drupalcode.org/project/decoupled_router/-/merge_requests/35)
touches `.cspell.json` and files under `tests/src/Functional` that the packaged
release excludes with `export-ignore`, so against a dist install the diff can
never apply whole, and Composer Patches 2.x fails the build rather than
skipping the missing files.

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

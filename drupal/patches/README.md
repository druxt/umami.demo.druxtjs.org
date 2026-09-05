# Patches

Local reworks of patches and merge requests still open upstream. Each one
should be pushed back to its issue and deleted from here.

## `druxt-3273228-views-route-langcode.patch`

Issue: [#3273228 Add langcode to Views Decoupled Router integration](https://www.drupal.org/project/druxt/issues/3273228)

Makes the Views decoupled-router integration resolve against the language in
the requested path, so a `/es` view route returns Spanish rather than the
site default. Without it a decoupled frontend sends `/es` straight back to `/`.

Rerolled here against **druxt 1.2.1**. The copy in `druxt.js` at
`docs/drupal/patches/` is against **1.2.0** and does not apply to 1.2.1:
1.2.1 added `use Symfony\Component\Routing\Exception\MethodNotAllowedException;`
itself, so that hunk lands a duplicate import and the file stops parsing.
Only druxt 1.2.1 supports Drupal 11, so this reroll is what makes the two
compatible.

The druxt.js copy needs the same treatment before that backend moves to
Drupal 11.

## `druxt-mr8-node-preview.patch`

Issue: [#3264181 Node Preview](https://www.drupal.org/project/druxt/issues/3264181)
Merge request: [MR!8](https://git.drupalcode.org/project/druxt/-/merge_requests/8)

Adds the `druxt_node_preview` submodule: the routes, controller, settings form
and template that let Drupal's node-preview tab render through the decoupled
frontend. Still open upstream after four years, and the only source of the
module, so the demo carries it.

Rerolled against **druxt 1.2.1**, with two changes from the raw MR diff:

- The `composer.json` hunk is dropped. It only adds `drupal/jsonapi_node_preview`
  as a druxt dependency, which the site requires directly anyway, and patching a
  package's own `composer.json` after resolution changes nothing. It was also the
  one hunk that conflicted, because 1.2.1 widened its core constraint and bumped
  `jsonapi_views`.
- `druxt_node_preview.info.yml` gains `^10 || ^11`. The MR predates both, so the
  submodule would refuse to install on the very version this demo now runs.

This demo exists partly to prove these out so they can go upstream. When MR!8
lands, delete this file and the `jsonapi_node_preview` requires with it.

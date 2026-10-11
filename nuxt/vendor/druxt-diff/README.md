# @druxt-contrib/diff

A decoupled diff for Druxt. It has two faces:

- a **backend-backed revision diff** over a `jsonapi_diff` document, turned into
  an ordered list of blocks with honest counts, rebuilt-draft re-pairing, and
  removed-block placement, and
- a **no-backend word diff**, `wordDiff(old, new)`, for comparing a staged value
  against the value it was staged from.

It renders inline through a field the host already rendered (the `v-diff`
directive), or as an old/new view in a panel (`DiffField`). It never reaches
into a store. What a host provides to drive a panel or overlay is an adapter,
described below.

## Engine

```js
import { normaliseDiff, wordDiff, groupRuns, condenseRuns } from '@druxt-contrib/diff'

const view = normaliseDiff(jsonapiDiffDocument)
// { blocks, summary, rebuilt, rootFields, meta }
```

- `normaliseDiff(document)` walks the tree, counts as it goes (the payload's own
  `summary` covers only the root's fields), re-pairs a rebuilt draft so an edit
  shows where it happened, and anchors each removed block to a surviving
  sibling.
- A block that changed position is `moved` rather than a removal and an
  addition. Its words are marked only where the text differs, so a section
  dragged somewhere else does not read as though every word of it changed, and
  an edit made on the way is still there to read. Moving one block past three
  others moves all four, so the longest run of blocks still in their old order
  is taken as the order that held, and what is left over is what moved.
- `anchorUuid(block, side)` is the uuid to look for in the page. A diff has two
  sides and a page renders one of them, and the two are not always the same
  entity: a backend that matches children by position pairs the blocks of a site
  that rebuilds its paragraphs on every import, where each revision has its own
  uuids. Each block has `uuids: { left, right }`, and a removed block has its
  neighbour's pair as `placeUuids`.
- `wordDiff(left, right)` is an LCS word diff with a semantic cleanup: a short
  common word wedged between two changes folds into the rewrite, and each token
  carries its trailing whitespace so grouping keeps spacing.
- `groupRuns(runs)` reorders a change region to all removals then all additions.
- `condenseRuns(runs, context)` trims long unchanged runs to a little context
  each side of a change.

The engine is framework-agnostic CommonJS and depends on nothing. It holds no
DOM: measuring a page is a component's work, so a host can drive the engine
from anywhere.

### A backend that recreates its blocks

Some backends do not keep a child entity between revisions. A site whose
content is generated and imported, rather than typed into Drupal, usually
rebuilds its paragraphs on every import: each revision then has its own uuids
and nothing matches by identity. Such a backend matches children by position
instead, and a diff resource stands for two entities that are not the same
entity.

So a block names both sides. The page renders one of them, so the
uuid to look for is the rendered side's, and `anchorUuid(block, side)` is the
one to ask. A site that renders an older revision reads `right`; one rendering
the working copy against what is published reads whichever side it asked the
backend for.

## `v-diff` directive

A decorator. It marks the change inside the element a field wrapper already
rendered, so the page keeps its formatting.

```js
import diff from '@druxt-contrib/diff/directive'
Vue.directive('diff', diff)
```

```vue
<p v-diff="fieldDiff">…the rendered field…</p>
```

Added words are wrapped in `<ins class="v-diff-ins">` where they are, and
removed words are struck as `<del class="v-diff-del">` before the word that
followed them. Words removed from the end of a field have no word after them,
so they are appended as `<del class="v-diff-del v-diff-del--trailing">`, which a
site can style as a block.

Bound to `{ left, right }` it wraps added words in `<ins>`, groups a rewritten
run into one strike then one addition, spans punctuation and edge whitespace so
the mark meets an adjacent inline element, and inserts removed words as `<del>`
where they were. A null value is a no-op, so the same binding covers "not
comparing" and "this field did not change". It is the primitive a diff wrapper
resolves to, the same seam an ICE editable registers at.

## `DiffField` component

```vue
<AppDiffField :field="field" :condense="true" :context="60" />
```

Renders a field's old/new word diff (grouped, Okabe-Ito, with a non-colour
channel), condensed to the changes and a little context unless `condense` is
false.

## `DiffMinimap` component

```vue
<DruxtDiffMinimap :blocks="diff.blocks" side="right" />
```

A rail down the edge of the page with a mark at each change, the way an editor
marks changed lines beside its scrollbar. A reader comparing a long page can
see where the changes are and go to one. Each mark is a button with a name a
screen reader reads, and the marks differ in width as well as colour.

It finds a block by the anchor its wrapper wrote, for the side the page
renders, and measures it. Measuring is a component's work, so the engine holds
no DOM: the arithmetic alone is `placeMarks(boxes, total)` and
`placeViewport(at, shown, total)`, exported for a site that draws its own rail
another way. Nothing renders on the server, where there is no page to measure.

| Prop        | What it is                                                                 |
| ----------- | -------------------------------------------------------------------------- |
| `blocks`    | The blocks from `normaliseDiff()`                                          |
| `side`      | The side the page renders, `right` by default                              |
| `statuses`  | Which statuses are marked                                                  |
| `resolve`   | `(uuid, block) => Element`, for a site that anchors its blocks its own way |
| `name`      | `(block, index, total) => string`, what a reader hears a mark called       |
| `container` | The element that scrolls, for a site that scrolls a panel                  |
| `label`     | What a reader hears the rail called                                        |

The default slot hands over `{ marks, viewport, scrollTo }` for a site that
wants its own markup, and `go` is emitted when a reader takes a mark.

## `DiffHost` component

The orchestration of a diff on a rendered page, so a site does not write its
own. Where the diff comes from is the host's business, whether that is a
backend's revision comparison or an edit staged in the browser. The component
takes the diff and a way to find the element rendering an entity, and does
the rest:

- waits for the changed blocks to render (text, or an element, because an
  image block never has any text), with a cap;
- marks each changed, added or moved block in place with a `data-diff`
  attribute and includes the rule that draws it in the margin, on custom
  properties (`--druxt-diff-changed`, `-added`, `-moved`, `-removed`,
  `-card`, `-card-border`, `-moved-label`) a site can restate;
- places a marker beside the block each removed block sat next to, or after
  the last block still on the page when it has no neighbour, or at
  `fallback` when nothing of the page rendered; the marker opens to a card of
  `DiffField`s;
- draws `DiffMinimap`, and re-marks when the diff or the viewport changes;
- provides itself as `druxtDiff` for the `diffable` mixin below.

```vue
<DruxtDiffHost :document="diff" :active="comparing" :labels="{ removed: 'Not in this revision' }" />
```

| Prop        | Default                        | What it is                                                                 |
| ----------- | ------------------------------ | -------------------------------------------------------------------------- |
| `document`  | `null`                         | a `jsonapi_diff` document, or a view from `normaliseDiff()`; null for none |
| `active`    | `true`                         | off, the page is left as rendered                                          |
| `resolve`   | the `data-druxt-entity` anchor | `(uuid, block) => Element \| null`                                         |
| `side`      | `'right'`                      | the side the page renders, for the minimap                                 |
| `labels`    | `{}`                           | `removed`, `minimap`, `empty`                                              |
| `minimap`   | `true`                         | whether to draw the rail                                                   |
| `container` | the window                     | the scrolling element the minimap measures against                         |
| `fallback`  | `null`                         | where a removed block with no neighbour goes on an empty page              |
| `wait`      | `6000`                         | ms to wait for the changed blocks to render                                |
| `settle`    | `250`                          | ms after the view is in before marking, so layout has settled              |

Events: `view` with the view once the page is ready (null when cleared), and
`marked` with `{ marked, removed }` counts after each pass. A document whose
`meta.staged` is true names the draft in the removed label (`Removed in this
draft`) unless `labels.removed` says otherwise. The default slot receives
`{ view, removed }`.

The lib behind it is exported for a host that uses the arithmetic without the
component: `viewOf`, `anchorsOf`, `blockFor`, `elementFor`, `rendered`,
`waitRendered`, `groupRemoved`, `resolveAnchor`.

## `diffable` mixin

A field wrapper's own diff, from the host above it. The wrapper reads its block
through the injected host and hands a field's `{ left, right }` to `v-diff` or
`DiffField`, so a field renders its diff as its own output and nothing is
painted over markup Vue may redraw.

```vue
<template>
  <div :data-druxt-entity="entity.id" v-diff="fieldDiff('field_text')">
    <slot />
  </div>
</template>

<script>
import { diffable } from '@druxt-contrib/diff'
export default { mixins: [diffable], props: { entity: Object } }
</script>
```

`diffUuid` reads `entity.id` or `resource.id`; a wrapper that names its entity
another way overrides it. `fieldDiff(name)` is null unless the host is active
and this block's content changed, and a wrapper rendered outside any host
behaves as if no diff existed.

A host with its own store can skip the component and provide an object with
`blockFor(uuid, status)` under the `druxtDiff` key; the mixin asks for nothing
else.

## Anchors

Reading and writing the DOM anchors (`data-druxt-*`) is
[`@druxt-contrib/anchors`](https://www.npmjs.com/package/@druxt-contrib/anchors),
a peer the overlay and the host's wrappers share with ICE.

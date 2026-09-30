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

## The adapter (the injection seam)

A full panel and overlay need orchestration. This package owns none of it: not
the current diff, not whether a comparison is on, not the fetch for an entity's
diff, not the way a block resolves to its rendered element. A library must stay
out of a host's store, and it must not claim the field-wrapper name the Druxt
cascade resolves, because two libraries claiming that name collide and the
loser does not render.

Instead the host provides an adapter, and a feature that needs a method it does
not have is simply absent, never broken:

| Method              | Returns / does                              |
| ------------------- | ------------------------------------------- |
| `getDiff()`         | the current `normaliseDiff` result, or null |
| `isComparing()`     | whether a comparison is active              |
| `fetchDiff(entity)` | fetch a `jsonapi_diff` document and set it  |
| `findBlock(uuid)`   | the block for a rendered entity id          |

This mirrors ICE's adapter/feature negotiation: declare `findBlock` (and the
rest) as adapter methods, and the diff controls gate themselves through the same
mechanism as every other capability. A standalone consumer passes an object with
those methods and nothing else.

## Anchors

Reading and writing the DOM anchors (`data-druxt-*`) is
[`@druxt-contrib/anchors`](https://www.npmjs.com/package/@druxt-contrib/anchors),
a peer the overlay and the host's wrappers share with ICE.

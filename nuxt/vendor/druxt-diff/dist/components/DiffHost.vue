<template>
  <div class="druxt-diff-host">
    <!-- Where the changes are on a long page. -->
    <DruxtDiffMinimap
      v-if="minimap && view && view.blocks.length"
      :blocks="view.blocks"
      :side="side"
      :resolve="resolver"
      :label="text.minimap"
      :name="markName"
      :container="container"
    />

    <!-- Where whole blocks were removed, a marker in the margin opens to what was there. -->
    <div v-if="removed.length" class="druxt-diff-removed" aria-live="polite">
      <div
        v-for="marker of removed"
        :key="marker.key"
        class="druxt-diff-removed-marker"
        :style="{
          top: marker.top + 'px',
          left: marker.left + 'px',
          width: marker.width + 'px',
        }"
      >
        <button
          type="button"
          class="druxt-diff-removed-dot"
          :aria-expanded="String(open === marker.key)"
          :aria-label="`${text.removed}: ${marker.blocks.length} ${marker.blocks.length === 1 ? 'block' : 'blocks'}`"
          @click="open = open === marker.key ? null : marker.key"
        >
          −
        </button>
        <div v-if="open === marker.key" class="druxt-diff-removed-card">
          <p class="druxt-diff-removed-title">{{ text.removed }}</p>
          <div
            v-for="(block, i) of marker.blocks"
            :key="i"
            class="druxt-diff-removed-block"
          >
            <DruxtDiffField
              v-for="field of block.fields"
              :key="field.name"
              :field="field"
              :condense="false"
            />
            <p v-if="!block.fields.length" class="druxt-diff-removed-empty">
              {{ text.empty }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <slot :view="view" :removed="removed" />
  </div>
</template>

<script>

import {
  MARKED,
  blockFor,
  elementFor,
  groupRemoved,
  resolveAnchor,
  viewOf,
  waitRendered,
} from '../lib/host'

/**
 * The orchestration of a diff on a rendered page, host-agnostic.
 *
 * Given a diff (a `jsonapi_diff` document, or a view already normalised) and
 * a way to find the element rendering an entity, this waits for the changed
 * blocks to render, marks each changed, added or moved block in place with a
 * `data-diff` attribute its wrapper styles, places a marker beside the block
 * each removed block sat next to (or after the last block on the page when it
 * has no neighbour), draws the minimap, and re-marks when the diff or the
 * viewport changes.
 *
 * Where the diff comes from is the host's business, whether that is a
 * backend's revision comparison or an edit staged in the browser. The
 * wrappers below it read their own block through the `diffable` mixin, which
 * injects this component, so a field renders its diff as its own output and
 * nothing is painted over markup Vue may redraw.
 */
export default {
  name: 'DruxtDiffHost',

  components: {
    DruxtDiffMinimap: () => import('./DiffMinimap.vue'),
    DruxtDiffField: () => import('./DiffField.vue'),
  },

  provide() {
    return { druxtDiff: this }
  },

  props: {
    /** The diff: a `jsonapi_diff` document, or a view from `normaliseDiff()`. Null for none. */
    document: {
      type: Object,
      default: null,
    },
    /** Whether to show anything; off, the page is left as rendered. */
    active: {
      type: Boolean,
      default: true,
    },
    /**
     * How an entity's uuid becomes an element: `(uuid, block) => Element|null`.
     * The default reads the anchor `@druxt-contrib/anchors` writes.
     */
    resolve: {
      type: Function,
      default: null,
    },
    /** The side the page renders, for the minimap. */
    side: {
      type: String,
      default: 'right',
    },
    /** The words: `removed` for the markers' cards, `minimap` for the rail, `empty` for a block with no fields. */
    labels: {
      type: Object,
      default: () => ({}),
    },
    /** Whether to draw the minimap. */
    minimap: {
      type: Boolean,
      default: true,
    },
    /** The scrolling element the minimap measures against, when not the window. */
    container: {
      type: null,
      default: null,
    },
    /** Where a removed block with no neighbour goes when nothing of the page rendered. */
    fallback: {
      type: null,
      default: null,
    },
    /** How long to wait for the changed blocks to render, in ms. */
    wait: {
      type: Number,
      default: 6000,
    },
    /** How long after the view is in to mark the page, in ms, so layout has settled. */
    settle: {
      type: Number,
      default: 250,
    },
  },

  data: () => ({ view: null, removed: [], open: null, marked: [], token: 0 }),

  computed: {
    resolver() {
      return this.resolve || resolveAnchor
    },
    /** The words, with a default for each; a staged diff names the draft. */
    text() {
      const staged = Boolean(
        this.view && this.view.meta && this.view.meta.staged
      )
      return {
        removed: staged ? 'Removed in this draft' : 'Removed',
        minimap: 'Changes on this page',
        empty: 'A block with nothing to compare.',
        ...this.labels,
      }
    },
  },

  watch: {
    document() {
      this.refresh()
    },
    active() {
      this.refresh()
    },
  },

  mounted() {
    this.onResize = () => this.mark()
    window.addEventListener('resize', this.onResize)
    this.refresh()
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
    this.clear()
  },

  methods: {
    /** The block an entity belongs to, for the wrappers. */
    blockFor(uuid, status) {
      return this.view ? blockFor(this.view.blocks, uuid, status) : null
    },

    /** One field's diff for an entity, or null when it did not change. */
    fieldDiff(uuid, name) {
      const block = this.blockFor(uuid, 'changed')
      return block ? block.fields.find((f) => f.name === name) || null : null
    },

    markName(block, index, total) {
      const what =
        {
          changed: 'Changed',
          added: 'Added',
          moved: 'Moved',
          removed: this.text.removed,
        }[block.status] || block.status
      return `${what}, ${index + 1} of ${total}`
    },

    /** Takes the current document on, waits for the page, then marks it. A later call wins. */
    async refresh() {
      const token = ++this.token
      this.clear()
      this.view = null
      this.$emit('view', null)
      if (!this.active || !this.document) return
      const view = viewOf(this.document)
      await waitRendered(view.blocks, this.resolver, { timeout: this.wait })
      if (token !== this.token) return
      this.view = view
      this.$emit('view', view)
      this.$nextTick(() =>
        setTimeout(() => token === this.token && this.mark(), this.settle)
      )
    },

    clear() {
      for (const el of this.marked) el.removeAttribute('data-diff')
      this.marked = []
      this.removed = []
      this.open = null
    },

    /** Margin rules on the blocks still on the page, and markers for the ones that are not. */
    mark() {
      for (const el of this.marked) el.removeAttribute('data-diff')
      this.marked = []
      if (!this.active || !this.view) return

      for (const block of this.view.blocks) {
        if (!MARKED.includes(block.status)) continue
        const el = elementFor(block, this.resolver)
        if (!el) continue
        el.setAttribute('data-diff', block.status)
        this.marked.push(el)
      }

      this.removed = groupRemoved(this.view, this.resolver, this.fallback).map(
        (group) => {
          const r = group.el.getBoundingClientRect()
          return {
            key: group.key,
            blocks: group.blocks,
            top:
              (group.side === 'after' ? r.bottom : r.top) + window.scrollY - 8,
            left: r.left + window.scrollX - 34,
            width: Math.max(r.width, 320),
          }
        }
      )
      this.$emit('marked', {
        marked: this.marked.length,
        removed: this.removed.length,
      })
    },
  },
}
</script>

<style>
/* The marks go on the host's own elements, so these are not scoped. The
   colours are custom properties with a default each, for a site to restate. */
[data-diff] {
  position: relative;
}
[data-diff]::before {
  content: '';
  position: absolute;
  left: -1.125rem;
  top: 0.25rem;
  bottom: 0.25rem;
  width: 3px;
  border-radius: 3px;
  background: var(--druxt-diff-changed, #b86e00);
}
[data-diff='added']::before {
  background: var(--druxt-diff-added, #2e7d32);
}
/* A block that moved has nothing marked inside it, so the rule says why it is
   marked at all: dashed rather than solid, and named in the margin. */
[data-diff='moved']::before {
  background: repeating-linear-gradient(
    var(--druxt-diff-moved, #1565c0) 0 6px,
    transparent 6px 10px
  );
}
[data-diff='moved']::after {
  content: var(--druxt-diff-moved-label, 'Moved');
  position: absolute;
  top: 0;
  right: 0;
  font-size: 0.625rem;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.2rem 0.35rem;
  border-radius: 0.25rem;
  color: var(--druxt-diff-moved-text, #ffffff);
  background: var(--druxt-diff-moved, #1565c0);
  pointer-events: none;
}
.druxt-diff-removed {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
}
.druxt-diff-removed-marker {
  position: absolute;
  z-index: 30;
}
.druxt-diff-removed-dot {
  width: 1rem;
  height: 1rem;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  border: 0;
  background: var(--druxt-diff-removed, #c7431b);
  color: var(--druxt-diff-removed-text, #ffffff);
  font:
    700 11px/1 ui-monospace,
    Menlo,
    monospace;
  cursor: pointer;
}
.druxt-diff-removed-card {
  margin-top: 0.375rem;
  padding: 0.75rem;
  background: var(--druxt-diff-card, #ffffff);
  border: 1px solid var(--druxt-diff-card-border, #d9dde3);
  border-radius: 0.6rem;
  box-shadow: 0 12px 32px -8px rgb(15 23 32 / 0.22);
}
.druxt-diff-removed-title {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
}
.druxt-diff-removed-block + .druxt-diff-removed-block {
  margin-top: 0.5rem;
}
.druxt-diff-removed-empty {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.6;
}
</style>

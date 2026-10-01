<template>
  <!-- The dev overlay's labels, drawn over the page in a fixed layer. Each
       names a Druxt component, says which file rendered it, and links there.
       Labels sharing a corner stack instead of covering each other. -->
  <div v-if="devOverlay" class="druxt-inspector-layer" aria-hidden="true">
    <a
      v-for="item of labels"
      :key="item.key"
      class="druxt-inspector-label"
      :class="`is-${item.kind}`"
      :href="item.href"
      rel="noopener"
      :style="item.style"
      target="_blank"
      :title="`${item.label} ${item.detail}`"
    >
      <span class="druxt-inspector-label__name">{{ item.label }}</span>
      <span v-if="item.detail" class="druxt-inspector-label__detail">{{
        item.detail
      }}</span>
    </a>
  </div>
</template>

<script>
import { mapState } from 'vuex'

/**
 * The box a component occupies. A wrapper with `display: contents` has no
 * box of its own, so the one around its children stands in for it: the
 * featured strip's cards sit in such wrappers and went unlabelled.
 */
const boxOf = (el) => {
  const own = el.getBoundingClientRect()
  if ((own.width && own.height) || !el.children.length) return own
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const child of el.children) {
    const r = child.getBoundingClientRect()
    if (!r.width || !r.height) continue
    left = Math.min(left, r.left)
    top = Math.min(top, r.top)
    right = Math.max(right, r.right)
    bottom = Math.max(bottom, r.bottom)
  }
  if (left === Infinity) return own
  return { left, top, width: right - left, height: bottom - top }
}

const LABEL_HEIGHT = 18
const CORNER = 8
/** The demo bar's height; nothing sits under it. */
const DEMO_BAR = 40

export default {
  data: () => ({ labels: [] }),

  computed: {
    ...mapState({
      devOverlay: (state) => state.ui.devOverlay,
    }),
  },

  watch: {
    '$inspector.tick': 'measure',
    '$inspector.hovered': 'measure',
    devOverlay: 'measure',
  },

  mounted() {
    this.onMove = () => {
      if (this.frame) return
      this.frame = window.requestAnimationFrame(() => {
        this.frame = null
        this.measure()
      })
    }
    window.addEventListener('scroll', this.onMove, { passive: true })
    window.addEventListener('resize', this.onMove, { passive: true })
    this.measure()
  },

  beforeDestroy() {
    window.removeEventListener('scroll', this.onMove)
    window.removeEventListener('resize', this.onMove)
  },

  methods: {
    /** Where every label goes now: viewport coordinates, corners stacked. */
    measure() {
      if (!this.devOverlay) {
        this.labels = []
        return
      }
      const hovered = this.$inspector.hovered
      const corners = {}
      const labels = []
      let key = 0
      for (const item of this.$inspector.items) {
        if (!item.el.isConnected) continue
        if (item.hover && !(hovered && item.el.contains(hovered))) continue
        const rect = boxOf(item.el)
        // An empty region or a block that rendered nothing has no box to name.
        if (!rect.width || !rect.height) continue
        const corner = `${Math.round(rect.left / CORNER)}:${Math.round(
          rect.top / CORNER
        )}`
        const shift = corners[corner] || 0
        corners[corner] = shift + 1
        // Above the component's edge, so the label covers none of it: a
        // label over a tab swallows the tap. Inside only at the top of the
        // page, where above would be under the demo bar.
        const above = rect.top - (shift + 1) * LABEL_HEIGHT
        labels.push({
          ...item,
          key: key++,
          style: {
            left: `${Math.max(0, rect.left)}px`,
            top: `${
              above >= DEMO_BAR ? above : rect.top + shift * LABEL_HEIGHT
            }px`,
            maxWidth: `${Math.max(120, rect.width)}px`,
          },
        })
      }
      this.labels = labels
    },
  },
}
</script>

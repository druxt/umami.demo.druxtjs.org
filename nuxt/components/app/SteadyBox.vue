<template>
  <!-- Keeps its height while what it holds is swapped: the old height stays
       until the new content has a size, then eases to it, so the page below
       does not collapse and jump on every toggle. -->
  <div
    class="steady"
    :class="{ 'steady--changing': changing }"
    :style="hold ? { minHeight: `${hold}px` } : null"
  >
    <div ref="inner" class="steady__inner"><slot /></div>
  </div>
</template>

<script>
export default {
  props: {
    /** What is shown: a change of it is a swap to steady. */
    swap: { type: [String, Number, Object, Array], default: null },
  },

  data: () => ({ hold: 0, changing: false }),

  watch: {
    // A user watcher runs before the render: the old content's height.
    swap: {
      deep: true,
      handler() {
        const inner = this.$refs.inner
        if (!inner) return
        this.hold = inner.offsetHeight
        this.changing = true
        clearTimeout(this.timeout)
        // However long the new content takes, the hold ends.
        this.timeout = setTimeout(this.release, 1500)
      },
    },
  },

  mounted() {
    if (typeof ResizeObserver === 'undefined') return
    // The new content has a size once it is most of the way to the old one,
    // or once it has stopped growing for a moment.
    this.resizes = new ResizeObserver(() => {
      if (!this.changing) return
      const height = this.$refs.inner.offsetHeight
      clearTimeout(this.settle)
      if (height >= this.hold * 0.8) return this.release()
      // Empty is the old content gone, not the new one arrived.
      if (height) this.settle = setTimeout(this.release, 250)
    })
    this.resizes.observe(this.$refs.inner)
  },

  beforeDestroy() {
    clearTimeout(this.timeout)
    clearTimeout(this.settle)
    if (this.resizes) this.resizes.disconnect()
  },

  methods: {
    release() {
      clearTimeout(this.timeout)
      clearTimeout(this.settle)
      const inner = this.$refs.inner
      this.changing = false
      if (!inner) return
      // Ease from the held height to the new one, then let go entirely.
      this.hold = inner.offsetHeight
      this.timeout = setTimeout(() => (this.hold = 0), 300)
    },
  },
}
</script>

<template>
  <!-- Who else has this page open, a note when an editor is in it, and a
       flash when Drupal's change arrives. The default slot takes over the
       markup: `{ people, editor, updated }`. -->
  <div class="druxt-presence" role="status" aria-live="polite">
    <slot v-bind="{ people, editor, updated }">
      <span v-if="updated" class="druxt-presence__updated"
        >Updated from Drupal just now</span
      >
      <span v-if="editor" class="druxt-presence__editing">Being edited</span>
      <span
        v-if="people.length"
        class="druxt-presence__count"
        :title="people.map((p) => p.name).join(', ')"
        v-text="people.length > 1 ? `${people.length} here now` : 'Just you'"
      />
    </slot>
  </div>
</template>

<script>

/** How long the update flash stays, in milliseconds. */
const FLASH = 6000

export default {
  name: 'DruxtPresence',

  props: {
    /** The page's channel; the route's path by default. */
    channel: { type: String, default: '' },
    /** `editor` while an edit form is open, else `reader`. */
    role: { type: String, default: 'reader' },
  },

  data: () => ({ people: [], now: Date.now() }),

  computed: {
    name() {
      return this.channel || `page:${this.$route ? this.$route.path : '/'}`
    },
    /** Someone else editing this page right now. */
    editor() {
      const self = this.$sockets ? this.$sockets.state.id : null
      return this.people.some((p) => p.role === 'editor' && p.id !== self)
    },
    updated() {
      return !!this.$sockets && this.now - this.$sockets.state.updatedAt < FLASH
    },
  },

  watch: {
    name(next, prev) {
      this.$sockets.leave(prev)
      this.people = []
      this.$sockets.join(next, this.role)
    },
    role(next) {
      this.$sockets.join(this.name, next)
    },
    '$sockets.state.updatedAt'() {
      this.now = Date.now()
      clearTimeout(this.fade)
      this.fade = setTimeout(() => {
        this.now = Date.now()
      }, FLASH + 100)
    },
  },

  mounted() {
    if (!this.$sockets) return
    this.off = this.$sockets.on('presence', ({ channel, payload }) => {
      if (channel === this.name) this.people = payload.people
    })
    this.$sockets.join(this.name, this.role)
  },

  beforeDestroy() {
    clearTimeout(this.fade)
    if (!this.$sockets) return
    this.off()
    this.$sockets.leave(this.name)
  },
}
</script>

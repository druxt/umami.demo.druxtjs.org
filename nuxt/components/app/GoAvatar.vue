<template>
  <!-- A player's initials on their seat's color. Decoration: the name is
       always written beside it. -->
  <span
    class="go-avatar"
    :class="`go-avatar--seat-${seat % 4}`"
    :style="size ? { '--go-avatar': `${size}px` } : null"
    aria-hidden="true"
    v-text="initials"
  />
</template>

<script>
export default {
  props: {
    name: { type: String, default: '' },
    /** The player's place at the table, which picks the color. */
    seat: { type: Number, default: 0 },
    /** Diameter in pixels; the stylesheet's default otherwise. */
    size: { type: Number, default: 0 },
  },

  computed: {
    /** "Saucy Basil" is SB; a single name gives its first two letters. */
    initials() {
      const words = this.name.trim().split(/\s+/).filter(Boolean)
      if (!words.length) return '?'
      const letters =
        words.length > 1
          ? words[0][0] + words[words.length - 1][0]
          : words[0].slice(0, 2)
      return letters.toUpperCase()
    },
  },
}
</script>

<template>
  <div
    class="dev-region"
    :class="{
      'dev-region--on': devOverlay,
      'dev-region--entity': entity,
    }"
  >
    <a
      v-if="devOverlay"
      class="dev-region__label"
      :href="href"
      rel="noopener"
      target="_blank"
    >
      {{ label }}
    </a>

    <slot />
  </div>
</template>

<script>
import { mapState } from 'vuex'

const REPO = 'https://github.com/druxt/umami.demo.druxtjs.org/blob/main/nuxt/'

export default {
  props: {
    /** Component name plus its distinguishing props, e.g. `DruxtBlockRegion name="header"`. */
    label: {
      type: String,
      required: true,
    },

    /** Teal treatment for entity-level wrappers; blue is for regions and views. */
    entity: {
      type: Boolean,
      default: false,
    },

    /** Repo-relative path of the override that rendered this, if there is one. */
    source: {
      type: String,
      default: '',
    },
  },

  computed: {
    ...mapState({
      devOverlay: (state) => state.ui.devOverlay,
    }),

    href: ({ source }) => (source ? REPO + source : 'https://druxtjs.org'),
  },
}
</script>

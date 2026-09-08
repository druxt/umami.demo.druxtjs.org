<template>
  <div class="demo-bar">
    <div class="demo-bar__inner">
      <span class="demo-bar__id">
        <span class="demo-bar__dot" />
        <!-- Three lengths of the same sentence, switched by Bootstrap's own
             display utilities so the row never wraps. -->
        <span class="d-none d-lg-inline">
          A DruxtJS demo — Drupal Umami content, rendered by Nuxt
        </span>
        <span class="d-none d-md-inline d-lg-none">
          A DruxtJS demo — Umami by Nuxt
        </span>
        <span class="d-inline d-md-none">DruxtJS demo</span>
      </span>

      <!-- One row at every width. Docs and Discord live in the drawer below
           lg (AppMobileDrawer) so this never wraps — see REPASS.md §1. -->
      <nav class="demo-bar__links">
        <a
          class="demo-bar__primary"
          :href="sourceUrl"
          rel="noopener"
          target="_blank"
        >
          <span class="d-none d-md-inline">View source</span>
          <span class="d-inline d-md-none">Source</span>
        </a>
        <a
          class="d-none d-md-flex"
          href="https://druxtjs.org"
          rel="noopener"
          target="_blank"
        >
          Docs
        </a>
        <a
          class="d-none d-lg-flex"
          href="https://discord.druxtjs.org"
          rel="noopener"
          target="_blank"
        >
          Discord
        </a>

        <button
          :aria-label="`Dev overlay ${devOverlay ? 'on' : 'off'}`"
          :aria-pressed="devOverlay ? 'true' : 'false'"
          class="demo-bar__toggle"
          :class="{ 'is-on': devOverlay }"
          type="button"
          @click="toggleDevOverlay"
        >
          <span class="d-none d-md-inline">Dev overlay</span>
          <span class="demo-bar__switch"><span class="demo-bar__knob" /></span>
        </button>
      </nav>
    </div>
  </div>
</template>

<script>
import { mapMutations, mapState } from 'vuex'

const REPO = 'https://github.com/druxt/umami.demo.druxtjs.org'

export default {
  props: {
    /**
     * Repo-relative path of the component that owns the current page, linked
     * from "View source". Pages set it; otherwise the repo root is used.
     */
    source: {
      type: String,
      default: '',
    },
  },

  computed: {
    ...mapState({
      devOverlay: (state) => state.ui.devOverlay,
    }),

    sourceUrl: ({ source }) =>
      source ? `${REPO}/blob/main/nuxt/${source}` : REPO,
  },

  methods: {
    ...mapMutations({
      toggleDevOverlay: 'ui/toggleDevOverlay',
    }),
  },
}
</script>

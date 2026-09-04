<template>
  <div class="demo-bar">
    <b-container class="demo-bar__inner">
      <span class="demo-bar__id">
        <span class="demo-bar__dot" />
        A DruxtJS demo — Drupal Umami content, rendered by Nuxt
      </span>

      <nav class="demo-bar__links">
        <a
          class="demo-bar__primary"
          :href="sourceUrl"
          rel="noopener"
          target="_blank"
        >
          View source
        </a>
        <a href="https://druxtjs.org" rel="noopener" target="_blank">Docs</a>
        <a href="https://discord.druxtjs.org" rel="noopener" target="_blank">
          Discord
        </a>

        <button
          class="demo-bar__toggle"
          :class="{ 'is-on': devOverlay }"
          type="button"
          :aria-pressed="devOverlay ? 'true' : 'false'"
          @click="toggleDevOverlay"
        >
          Dev overlay <span>{{ devOverlay ? 'on' : 'off' }}</span>
        </button>
      </nav>
    </b-container>
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

<template>
  <div class="masthead">
    <!-- Below lg: toggle, wordmark, search on one row. The menu is a drawer
         (AppMobileDrawer), not a collapse — see REPASS.md §1. -->
    <button
      v-b-toggle.menu
      aria-label="Open menu"
      class="masthead__toggle"
      type="button"
    >
      <span class="masthead__toggle-bar" />
      <span class="masthead__toggle-bar" />
    </button>

    <!-- Branding. DruxtBlock wraps each block in a div of its own, so the
         growing element has to be this one, not the block's own class. -->
    <div class="masthead__brand-slot">
      <slot name="umami_branding" />
    </div>

    <!-- One search panel, not two: below lg this opens the drawer, which
         holds the field. The #search sidebar belongs to the desktop row. -->
    <button
      aria-label="Search recipes"
      class="masthead__search-icon"
      type="button"
      @click="openSearch"
    >
      <BIconSearch aria-hidden="true" />
    </button>

    <!-- lg and up: the full editorial row. -->
    <div class="masthead__desktop">
      <DruxtBlockSystemMenuBlockMain />

      <div class="masthead__utils">
        <button v-b-toggle.search class="masthead__search" type="button">
          <BIconSearch aria-hidden="true" />
          Search recipes
        </button>

        <nav aria-label="Language" class="masthead__lang">
          <nuxt-link
            v-for="code in ['en', 'es']"
            :key="code"
            :class="{ 'is-active': code === current }"
            :to="path(code)"
          >
            {{ code.toUpperCase() }}
          </nuxt-link>
        </nav>
      </div>
    </div>
  </div>
</template>

<script>
import { BIconSearch } from 'bootstrap-vue'

export default {
  components: { BIconSearch },

  computed: {
    current() {
      return (this.$route.path.match(/^\/(en|es)(\/|$)/) || [])[1] || 'en'
    },
  },

  methods: {
    /** Open the drawer on its search field. */
    openSearch() {
      this.$root.$emit('umami::search')
      this.$root.$emit('bv::toggle::collapse', 'menu')
    },

    /**
     * Swap the language prefix on the current route. Druxt resolves the
     * translated route client-side, so this is a normal in-app navigation.
     *
     * The inactive link used to carry an inline #a2988a — the pre-correction
     * ghost token at 2.75:1. Contrast now lives in the theme, not here.
     */
    path(langcode) {
      const path = this.$route.path
      if (/^\/(en|es)(\/|$)/.test(path)) {
        return path.replace(/^\/(en|es)/, `/${langcode}`)
      }
      return `/${langcode}${path === '/' ? '' : path}`
    },
  },
}
</script>

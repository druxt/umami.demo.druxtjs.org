<template>
  <div class="masthead">
    <!-- Below lg: toggle, wordmark, search on one row. The menu is a drawer
         (AppMobileDrawer), not a collapse — see REPASS.md §1. -->
    <button
      v-b-toggle.menu
      :aria-label="$t('nav.openMenu')"
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
      :aria-label="$t('nav.searchRecipes')"
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
          <BIconSearch aria-hidden="true" />{{ $t('nav.searchRecipes') }}
        </button>

        <AppAccountLink class="masthead__account" />

        <nav :aria-label="$t('nav.language')" class="masthead__lang">
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
import { langSwitchMixin } from '~/utils/lang'

export default {
  components: { BIconSearch },

  // The language links: each one to that language's version of the page.
  mixins: [langSwitchMixin],

  fetchKey: 'lang-switch-header',

  methods: {
    /** Open the drawer on its search field. */
    openSearch() {
      this.$root.$emit('umami::search')
      this.$root.$emit('bv::toggle::collapse', 'menu')
    },
  },
}
</script>

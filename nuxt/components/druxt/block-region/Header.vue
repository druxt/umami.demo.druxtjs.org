<template>
  <div class="masthead">
    <!-- Branding -->
    <slot name="umami_branding" />

    <b-navbar-toggle target="nav-collapse" />

    <b-collapse id="nav-collapse" class="masthead__nav" is-nav>
      <!-- Main menu -->
      <DruxtBlockSystemMenuBlockMain />

      <div class="masthead__utils">
        <button v-b-toggle.search class="masthead__search" type="button">
          <BIconSearch aria-hidden="true" />
          Search recipes
        </button>

        <span class="masthead__lang">
          <nuxt-link :to="path('en')">EN</nuxt-link>
          <span style="color: #c4b9a8">/</span>
          <nuxt-link :to="path('es')" style="color: #a2988a">ES</nuxt-link>
        </span>
      </div>
    </b-collapse>
  </div>
</template>

<script>
import { BIconSearch } from 'bootstrap-vue'

export default {
  components: { BIconSearch },

  methods: {
    /**
     * Swap the language prefix on the current route. Druxt resolves the
     * translated route client-side, so this is a normal in-app navigation
     * with no full page load.
     */
    path(langcode) {
      return this.$route.path.replace(/^\/(en|es)/, `/${langcode}`)
    },
  },
}
</script>

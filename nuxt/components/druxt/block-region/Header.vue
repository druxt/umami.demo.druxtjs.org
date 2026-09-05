<template>
  <!-- Plain div on purpose: layouts/default.vue already wraps this region in a
       b-navbar (toggleable lg, sticky) via DruxtBlockRegion's wrapper prop, so
       nesting another navbar here duplicates the class and the padding. -->
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
      const path = this.$route.path
      // Prefixed route: swap the prefix.
      if (/^\/(en|es)(\/|$)/.test(path)) {
        return path.replace(/^\/(en|es)/, `/${langcode}`)
      }
      // Unprefixed routes exist (the entity explorer uses the plain layout and
      // still renders this header). Without this the regex matches nothing and
      // both links resolve to the current path, so the switcher looks broken.
      return `/${langcode}${path === '/' ? '' : path}`
    },
  },
}
</script>

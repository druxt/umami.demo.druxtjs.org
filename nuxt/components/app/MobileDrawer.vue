<template>
  <b-sidebar
    id="menu"
    backdrop
    left
    no-close-on-route-change
    no-header
    shadow
    width="min(330px, 86vw)"
    @shown="onShown"
  >
    <template #default="{ hide }">
      <div class="drawer">
        <div class="drawer__head">
          <nuxt-link class="drawer__brand" to="/" @click.native="hide">
            <span class="drawer__wordmark">Umami</span>
            <span class="drawer__tagline">Food magazine</span>
          </nuxt-link>

          <button
            aria-label="Close menu"
            class="drawer__close"
            type="button"
            @click="hide"
          >
            <BIconX aria-hidden="true" />
          </button>
        </div>

        <!-- Search lives in the drawer, so on a phone finding a recipe is one
             tap. The separate #search sidebar is for lg and up, which is why
             this one is compact: no second heading, no second close. -->
        <div class="drawer__search">
          <DruxtSearchbar ref="search" compact />
        </div>

        <DruxtMenu class="drawer__menu" component="nav" name="main">
          <template #item="{ item: { entity }, to }">
            <nuxt-link class="drawer__link" :to="to" @click.native="hide">
              {{ entity.attributes.title }}
            </nuxt-link>
          </template>
        </DruxtMenu>

        <div class="drawer__lang">
          <nuxt-link
            v-for="code in ['en', 'es']"
            :key="code"
            :class="['drawer__lang-btn', { 'is-active': code === current }]"
            :to="path(code)"
            @click.native="hide"
          >
            {{ code.toUpperCase() }}
          </nuxt-link>
        </div>

        <!-- The promo layer stays confined to blue. Moving these four links
             here is what lets the demo bar hold one row on a phone. -->
        <div class="drawer__druxt">
          <span class="drawer__druxt-kicker">Built with Druxt</span>

          <nuxt-link class="drawer__druxt-link" to="/entity-explorer">
            Entity Explorer <span aria-hidden="true">→</span>
          </nuxt-link>

          <a
            v-for="link in links"
            :key="link.href"
            class="drawer__druxt-link"
            :href="link.href"
            rel="noopener"
            target="_blank"
          >
            {{ link.title }} <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </template>
  </b-sidebar>
</template>

<script>
import { BIconX } from 'bootstrap-vue'

export default {
  components: { BIconX },

  data: () => ({
    focusSearch: false,
    links: [
      {
        title: 'View source',
        href: 'https://github.com/druxt/umami.demo.druxtjs.org',
      },
      { title: 'Docs', href: 'https://druxtjs.org' },
      { title: 'Discord', href: 'https://discord.druxtjs.org' },
    ],
  }),

  computed: {
    current() {
      return (this.$route.path.match(/^\/(en|es)(\/|$)/) || [])[1] || 'en'
    },
  },

  mounted() {
    // The masthead's search button opens this drawer rather than a second
    // panel from the other side, and asks for the field.
    this.$root.$on('umami::search', this.onSearchRequest)
  },

  beforeDestroy() {
    this.$root.$off('umami::search', this.onSearchRequest)
  },

  methods: {
    onSearchRequest() {
      this.focusSearch = true
    },

    onShown() {
      if (!this.focusSearch) {
        return
      }
      this.focusSearch = false
      this.$nextTick(() => this.$refs.search && this.$refs.search.focus())
    },

    /** Swap the language prefix on the current route. */
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

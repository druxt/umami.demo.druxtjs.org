<template>
  <b-sidebar
    id="menu"
    backdrop
    lazy
    left
    no-close-on-route-change
    no-header
    shadow
    width="min(330px, 86vw)"
    @hidden="lockPage(false)"
    @shown="onShown"
  >
    <template #default="{ hide }">
      <div class="drawer">
        <div class="drawer__head">
          <nuxt-link class="drawer__brand" to="/" @click.native="hide">
            <span class="drawer__wordmark">Umami</span>
            <span class="drawer__tagline">{{ $t('site.tagline') }}</span>
          </nuxt-link>

          <button
            :aria-label="$t('nav.closeMenu')"
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
          <!-- The slot replaces the menu's own list item, so it keeps one:
               a list holds nothing but items. -->
          <template #item="{ item: { entity }, to }">
            <li class="drawer__item">
              <nuxt-link class="drawer__link" :to="to" @click.native="hide">
                {{ entity.attributes.title }}
              </nuxt-link>
            </li>
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
          <span class="drawer__druxt-kicker">
            <AppDruxtLogo class="drawer__druxt-logo" />
            {{ $t('demoBar.builtWith') }}
          </span>

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

          <nuxt-link
            class="drawer__druxt-link"
            to="/entity-explorer"
            @click.native="hide"
          >
            {{ $t('demoBar.entityExplorer') }} <span aria-hidden="true">→</span>
          </nuxt-link>

          <AppAccountLink class="drawer__druxt-link" @click.native="hide" />
          <!-- The demo bar has no room for this below md; the drawer does. -->
          <client-only><AppResetDemo class="drawer__reset" /></client-only>
        </div>
      </div>
    </template>
  </b-sidebar>
</template>

<script>
import { BIconX } from 'bootstrap-vue'
import { demoMixin } from '~/utils/demo'
import { langSwitchMixin } from '~/utils/lang'

export default {
  components: { BIconX },

  // The language buttons: each one to that language's version of the page.
  mixins: [demoMixin, langSwitchMixin],

  fetchKey: 'lang-switch-drawer',

  data: () => ({ focusSearch: false }),

  computed: {
    /** The Druxt links, from Drupal's config page. */
    links: ({ demo }) => [demo.source, demo.docs, demo.discord],
  },

  watch: {
    /** A link in the drawer opens a new page, which starts at the top. */
    '$route.path'() {
      this.scrollY = 0
    },
  },

  mounted() {
    // The masthead's search button opens this drawer rather than a second
    // panel from the other side, and asks for the field.
    this.$root.$on('umami::search', this.onSearchRequest)
  },

  beforeDestroy() {
    this.$root.$off('umami::search', this.onSearchRequest)
    this.lockPage(false)
  },

  methods: {
    onSearchRequest() {
      this.focusSearch = true
    },

    /**
     * Hold the page still behind the open drawer, so a swipe scrolls the
     * drawer, and put the reader back where they were when it closes.
     */
    lockPage(locked) {
      const body = document.body
      if (locked) {
        this.scrollY = window.scrollY
        Object.assign(body.style, {
          position: 'fixed',
          top: `-${this.scrollY}px`,
          width: '100%',
        })
        return
      }
      if (body.style.position !== 'fixed') {
        return
      }
      Object.assign(body.style, { position: '', top: '', width: '' })
      window.scrollTo(0, this.scrollY || 0)
    },

    onShown() {
      this.lockPage(true)
      if (!this.focusSearch) {
        return
      }
      this.focusSearch = false
      this.$nextTick(() => this.$refs.search && this.$refs.search.focus())
    },
  },
}
</script>

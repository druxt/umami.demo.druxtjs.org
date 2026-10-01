<template>
  <div class="demo-bar">
    <div class="demo-bar__inner">
      <span class="demo-bar__id">
        <AppDruxtLogo class="demo-bar__logo" mono />
        <!-- Three lengths of the same sentence, switched by Bootstrap's own
             display utilities so the row never wraps. -->
        <span class="d-none d-lg-inline">{{ $t('demoBar.long') }}</span>
        <span class="d-none d-md-inline d-lg-none">{{
          $t('demoBar.mid')
        }}</span>
        <span class="d-inline d-md-none">{{ $t('demoBar.short') }}</span>
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
          <span class="d-none d-md-inline">{{ $t('demoBar.viewSource') }}</span>
          <span class="d-inline d-md-none">{{ $t('demoBar.source') }}</span>
        </a>
        <a
          class="d-none d-md-flex"
          :href="demo.docs.href"
          rel="noopener"
          target="_blank"
          >{{ $t('demoBar.docs') }}</a
        >
        <a
          class="d-none d-lg-flex"
          :href="demo.discord.href"
          rel="noopener"
          target="_blank"
          >{{ $t('demoBar.discord') }}</a
        >

        <client-only
          ><AppResetDemo class="d-none d-md-inline-flex"
        /></client-only>

        <button
          :aria-label="`${$t('demoBar.devOverlay')} ${
            devOverlay ? 'on' : 'off'
          }`"
          :aria-pressed="devOverlay ? 'true' : 'false'"
          class="demo-bar__toggle"
          :class="{ 'is-on': devOverlay }"
          type="button"
          @click="toggleDevOverlay"
        >
          <span class="d-none d-md-inline">{{ $t('demoBar.devOverlay') }}</span>
          <span class="d-md-none">{{ $t('demoBar.devShort') }}</span>
          <span class="demo-bar__switch"><span class="demo-bar__knob" /></span>
        </button>
      </nav>
    </div>
  </div>
</template>

<script>
import { mapMutations, mapState } from 'vuex'
import { demoMixin } from '~/utils/demo'

export default {
  mixins: [demoMixin],

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

    sourceUrl: ({ source, demo }) =>
      source
        ? `${demo.source.href}/blob/main/nuxt/${source}`
        : demo.source.href,
  },

  methods: {
    ...mapMutations({
      toggleDevOverlay: 'ui/toggleDevOverlay',
    }),
  },
}
</script>

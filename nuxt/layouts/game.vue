<template>
  <!-- Umami Go's front door: the masthead, the page and the slim footer.
       The bands the magazine closes a page with, the collections and the
       Druxt promotion, would push the game off a phone's screen. -->
  <div>
    <AppDemoBar />
    <client-only><AppDebugPanel /><AppDruxtInspector /></client-only>

    <!-- Same sticky masthead as the default layout. -->
    <div class="masthead-sticky">
      <DruxtBlockRegion
        name="header"
        theme="umami"
        :wrapper="{
          class: ['masthead-wrapper'],
          component: 'b-navbar',
          propsData: { sticky: true, toggleable: false },
        }"
      />
    </div>

    <!-- The page draws its own bands: the hero is full bleed. -->
    <main>
      <Nuxt />
    </main>

    <div class="site-footer">
      <b-container>
        <DruxtBlockRegion name="bottom" theme="umami" />
      </b-container>
    </div>

    <AppMobileDrawer />
    <AppSignInDialog />

    <b-sidebar
      id="search"
      backdrop
      no-close-on-route-change
      no-header
      right
      shadow
      width="min(520px, 100vw)"
      @shown="focusSearch"
    >
      <DruxtSearchbar ref="searchbar" />
    </b-sidebar>
  </div>
</template>

<script>
import { langcodeOf } from '~/utils/lang'

export default {
  head() {
    return { htmlAttrs: { lang: langcodeOf(this.$route.path) } }
  },

  methods: {
    /** The search panel is open: the cursor goes to the field. */
    focusSearch() {
      this.$nextTick(() => this.$refs.searchbar && this.$refs.searchbar.focus())
    },
  },
}
</script>

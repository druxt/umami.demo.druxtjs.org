<template>
  <DruxtSite theme="umami">
    <template #default="{ props, regions }">
      <div>
        <AppDemoBar />
        <client-only><AppDebugPanel /><AppDruxtInspector /></client-only>

        <!-- The wrapper is what sticks: a sticky element can only stay
             within its parent's box, and this parent is the page. -->
        <div v-if="regions.includes('header')" class="masthead-sticky">
          <!-- toggleable: false — the phone menu is a drawer now, so the
               navbar no longer owns a collapse. -->
          <DruxtBlockRegion
            v-bind="props.header"
            :wrapper="{
              class: ['masthead-wrapper'],
              component: 'b-navbar',
              propsData: { sticky: true, toggleable: false },
            }"
          />
        </div>

        <DruxtBlockRegion
          v-if="regions.includes('banner_top')"
          v-bind="props.banner_top"
        />

        <!-- The one note in the editorial flow, and the front page is where
             it earns its place: the bands above are Drupal's block layout. -->
        <div v-if="isFront" class="band band--paper d-none d-md-block">
          <b-container>
            <AppDruxtNote
              :code="blocksSnippet"
              :cta="$t('note.blocksCta')"
              href="https://druxtjs.org/modules/blocks"
              :kicker="$t('note.howThisPageWorks')"
              :title="$t('note.blocksTitle')"
              >{{ $t('note.blocksBody') }}</AppDruxtNote
            >
          </b-container>
        </div>

        <!-- v-if, not v-show: on the front page these should not be in the
             DOM at all. isHomePath is false at /en/ because the router's home
             path is /node, so the langcode roots are tested here too. -->
        <!-- Drupal has no breadcrumb or title for a route it does not know,
             so on a Nuxt-owned page this band would be an empty stripe. -->
        <!-- A node draws its own head under its photograph; a term draws its
             own band with the kicker and the count. -->
        <div
          v-if="!isFront && isDrupalRoute && !ownsHead"
          class="band band--warm band--head"
        >
          <b-container>
            <DruxtBlockRegion
              v-if="regions.includes('breadcrumbs')"
              v-bind="props.breadcrumbs"
            />
            <DruxtBlockRegion
              v-if="regions.includes('page_title')"
              v-bind="props.page_title"
            />
          </b-container>
        </div>

        <!-- Every band is full-bleed with its own ground; the content inside
             every band sits in the same b-container. See REPASS.md §2. -->
        <!-- A page that draws its own head sits closer to the masthead. -->
        <div class="band band--paper" :class="{ 'band--flush': ownsHead }">
          <b-container>
            <slot v-if="$slots.default" />
            <DruxtBlockRegion
              v-else-if="regions.includes('content')"
              v-bind="props.content"
            />
          </b-container>
        </div>

        <!-- Each block in this region brings its own band: the region holds
             the articles grid and the collection pills, on different
             grounds. -->
        <DruxtBlockRegion
          v-if="regions.includes('content_bottom')"
          v-bind="props.content_bottom"
        />

        <div
          v-if="regions.includes('footer')"
          class="band band--paper band--footer"
        >
          <b-container>
            <DruxtBlockRegion v-bind="props.footer" />
          </b-container>
        </div>

        <!-- The one unconditional piece of promotion in the page flow. -->
        <AppDruxtCta />

        <div v-if="regions.includes('bottom')" class="site-footer">
          <b-container>
            <DruxtBlockRegion v-bind="props.bottom" />
          </b-container>
        </div>

        <AppMobileDrawer />

        <!-- lazy, so only one DruxtSearchbar is mounted at a time: the
             drawer holds the other one, and two mounted panels fought over
             the autofocus. -->
        <b-sidebar
          id="search"
          backdrop
          lazy
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
  </DruxtSite>
</template>

<script>
import { isFront } from '~/utils/front'

const SNIPPET = [
  "<span class='t'>&lt;DruxtBlockRegion</span>",
  "  <span class='a'>name</span>=<span class='v'>\"banner_top\"</span>",
  "  <span class='a'>theme</span>=<span class='v'>\"umami\"</span>",
  "<span class='t'>/&gt;</span>",
].join('\n')

export default {
  data: () => ({ blocksSnippet: SNIPPET }),

  computed: {
    /** The router resolved this path to something in Drupal. */
    isDrupalRoute() {
      return !!this.$store.state.druxtRouter.route.resolvedPath
    },

    ownsHead() {
      const { entity } = this.$store.state.druxtRouter.route
      return ['node', 'taxonomy_term'].includes((entity || {}).type)
    },

    isFront() {
      return isFront(this.$store.state.druxtRouter.route, this.$route.path)
    },
  },

  methods: {
    /** The panel is open: the cursor goes to the field, ready to type. */
    focusSearch() {
      this.$nextTick(() => this.$refs.searchbar && this.$refs.searchbar.focus())
    },
  },
}
</script>

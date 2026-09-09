<template>
  <DruxtSite theme="umami">
    <template #default="{ props, regions }">
      <div>
        <AppDemoBar />

        <AppDevRegion
          v-if="regions.includes('header')"
          label='DruxtBlockRegion name="header"'
          source="components/druxt/block-region/Header.vue"
        >
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
        </AppDevRegion>

        <AppDevRegion
          v-if="regions.includes('banner_top')"
          label='DruxtBlockRegion name="banner_top"'
          source="components/druxt/block-region/BannerTop.vue"
        >
          <DruxtBlockRegion v-bind="props.banner_top" />
        </AppDevRegion>

        <!-- v-if, not v-show: on the front page these should not be in the
             DOM at all. isHomePath is false at /en/ because the router's home
             path is /node, so the langcode roots are tested here too. -->
        <!-- A Nuxt page owns its own heading, and Drupal has no breadcrumb
             for a route it does not know, so the band would be empty. -->
        <div v-if="!isFront && !$slots.default" class="band band--paper">
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
        <AppDevRegion
          label='DruxtBlockRegion name="content"'
          source="layouts/default.vue"
        >
          <div class="band band--paper">
            <b-container>
              <slot v-if="$slots.default" />
              <DruxtBlockRegion
                v-else-if="regions.includes('content')"
                v-bind="props.content"
              />
            </b-container>
          </div>
        </AppDevRegion>

        <div
          v-if="regions.includes('content_bottom')"
          class="band band--warm collections"
        >
          <b-container>
            <DruxtBlockRegion v-bind="props.content_bottom" />
          </b-container>
        </div>

        <div v-if="regions.includes('footer')" class="band band--paper">
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
        >
          <DruxtSearchbar />
        </b-sidebar>
      </div>
    </template>
  </DruxtSite>
</template>

<script>
const FRONT = /^\/(en|es)?\/?$/

export default {
  computed: {
    isFront() {
      const route = this.$store.state.druxtRouter.route
      return !!route.isHomePath || FRONT.test(this.$route.path)
    },
  },
}
</script>

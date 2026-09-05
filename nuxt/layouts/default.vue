<template>
  <DruxtSite theme="umami">
    <template #default="{ props, regions }">
      <div>
        <AppDemoBar />

        <DevRegion
          v-if="regions.includes('header')"
          label='DruxtBlockRegion name="header"'
          source="components/druxt/block-region/Header.vue"
        >
          <DruxtBlockRegion
            v-bind="props.header"
            :wrapper="{
              class: ['masthead-wrapper'],
              component: 'b-navbar',
              propsData: { sticky: true, toggleable: 'lg' },
            }"
          />
        </DevRegion>

        <DevRegion
          v-if="regions.includes('banner_top')"
          label='DruxtBlockRegion name="banner_top"'
          source="components/druxt/block-region/BannerTop.vue"
        >
          <DruxtBlockRegion v-bind="props.banner_top" />
        </DevRegion>

        <b-container v-show="!isHomePath" class="pt-4">
          <DruxtBlockRegion
            v-if="regions.includes('breadcrumbs')"
            v-bind="props.breadcrumbs"
          />
          <DruxtBlockRegion
            v-if="regions.includes('page_title')"
            v-bind="props.page_title"
          />
        </b-container>

        <DevRegion
          label='DruxtBlockRegion name="content"'
          source="layouts/default.vue"
        >
          <b-container
            :class="isHomePath ? 'px-0' : 'pb-5'"
            :fluid="isHomePath"
          >
            <slot v-if="$slots.default" />
            <DruxtBlockRegion
              v-else-if="regions.includes('content')"
              v-bind="props.content"
            />
          </b-container>
        </DevRegion>

        <div v-if="regions.includes('content_bottom')" class="collections">
          <b-container>
            <DruxtBlockRegion v-bind="props.content_bottom" />
          </b-container>
        </div>

        <div v-if="regions.includes('footer')" class="section">
          <b-container>
            <DruxtBlockRegion v-bind="props.footer" />
          </b-container>
        </div>

        <!-- The one unconditional piece of promotion in the page flow. -->
        <AppDruxtCta />

        <div v-if="regions.includes('bottom')" class="disclaimer">
          <b-container>
            <DruxtBlockRegion v-bind="props.bottom" />
          </b-container>
        </div>

        <b-sidebar
          id="search"
          backdrop
          no-close-on-route-change
          no-header
          right
          shadow
          width="520px"
        >
          <DruxtSearchbar />
        </b-sidebar>
      </div>
    </template>
  </DruxtSite>
</template>

<script>
export default {
  computed: {
    isHomePath: ({ $store }) => !!$store.state.druxtRouter.route.isHomePath,
  },
}
</script>

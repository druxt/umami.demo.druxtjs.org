<template>
  <DruxtSite theme="umami">
    <template #default="{ props, regions }">
      <b-container fluid>
        <DruxtBlockRegion
          v-if="regions.includes('header')"
          v-bind="props.header"
          :wrapper="{
            class: ['bg-white', 'p-3'],
            component: 'b-navbar',
            propsData: {
              sticky: true,
              toggleable: 'lg',
            },
          }"
        />

        <DruxtBlockRegion
          v-if="regions.includes('banner_top')"
          v-bind="props.banner_top"
        />

        <b-row class="bg-light">
          <b-container :class="containerClass">
            <b-row v-if="!isHomePath && regions.includes('breadcrumbs')">
              <b-col>
                <DruxtBlockRegion v-bind="props.breadcrumbs" />
              </b-col>
            </b-row>

            <b-row v-if="!isHomePath && regions.includes('page_title')">
              <b-col class="mb-3 mb-md-5">
                <DruxtBlockRegion v-bind="props.page_title" />
              </b-col>
            </b-row>

            <DruxtBlockRegion
              v-if="regions.includes('content')"
              v-bind="props.content"
            />
          </b-container>
        </b-row>

        <b-row
          v-if="regions.includes('content_bottom')"
          class="bg-secondary text-white"
        >
          <b-container
            :class="containerClass.concat(['text-center', 'text-md-left'])"
          >
            <DruxtBlockRegion v-bind="props.content_bottom" />
          </b-container>
        </b-row>

        <b-row v-if="regions.includes('footer')" class="bg-dark text-white">
          <b-container
            :class="containerClass.concat(['text-center', 'text-md-left'])"
          >
            <DruxtBlockRegion v-bind="props.footer" />
          </b-container>
        </b-row>

        <b-row v-if="regions.includes('bottom')">
          <b-container
            :class="containerClass.concat(['text-center', 'text-md-left'])"
          >
            <DruxtBlockRegion v-bind="props.bottom" />
          </b-container>
        </b-row>

        <DruxtSearchbar />
        <DruxtStarbar />
      </b-container>
    </template>
  </DruxtSite>
</template>

<script>
export default {
  computed: {
    containerClass: () => ['mb-3', 'mt-3', 'mb-md-5', 'mt-md-5'],

    isHomePath: ({ $store }) => !!$store.state.druxtRouter.route.isHomePath,
  },
}
</script>

<style>
html {
  font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  word-spacing: 1px;
  -ms-text-size-adjust: 100%;
  -webkit-text-size-adjust: 100%;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
}

.sticky-top {
  margin: 0 -15px;
}
</style>

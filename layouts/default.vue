<template>
  <b-container fluid>
    <!-- Header -->
    <DruxtBlockRegion
      name="header"
      :wrapper="{
        class: ['bg-white', 'p-3'],
        component: 'b-navbar',
        propsData: {
          sticky: true,
          toggleable: 'lg',
        },
      }"
      v-bind="defaults"
    />

    <!-- Banner: Top -->
    <Druxt module="block-region" name="banner_top" v-bind="defaults" />

    <!-- Content -->
    <b-row class="bg-light">
      <b-container :class="containerClass">
        <!-- Breadcrumb -->
        <b-row v-if="!isHomePath">
          <b-col>
            <DruxtBlockRegion name="breadcrumbs" v-bind="defaults" />
          </b-col>
        </b-row>

        <!-- Page title -->
        <b-row v-if="!isHomePath">
          <b-col class="mb-3 mb-md-5">
            <DruxtBlockRegion name="page_title" v-bind="defaults" />
          </b-col>
        </b-row>

        <DruxtBlockRegion name="content" v-bind="defaults" />
      </b-container>
    </b-row>

    <!-- Content: Bottom -->
    <b-row class="bg-secondary text-white">
      <b-container
        :class="containerClass.concat(['text-center', 'text-md-left'])"
      >
        <DruxtBlockRegion name="content_bottom" v-bind="defaults" />
      </b-container>
    </b-row>

    <!-- Footer -->
    <b-row class="bg-dark text-white">
      <b-container
        :class="containerClass.concat(['text-center', 'text-md-left'])"
      >
        <DruxtBlockRegion name="footer" v-bind="defaults" />
      </b-container>
    </b-row>

    <!-- Bottom -->
    <b-row>
      <b-container
        :class="containerClass.concat(['text-center', 'text-md-left'])"
      >
        <DruxtBlockRegion name="bottom" v-bind="defaults" />
      </b-container>
    </b-row>

    <!-- Sidebar search -->
    <b-sidebar
      id="search"
      title="Search"
      backdrop
      shadow
      no-close-on-route-change
      right
    >
      <DruxtSearchbar />
    </b-sidebar>
  </b-container>
</template>

<script>
export default {
  data: () => ({
    defaults: {
      theme: 'umami',
    },
  }),

  computed: {
    containerClass: () => ['mb-3', 'mt-3', 'mb-md-5', 'mt-md-5'],

    isHomePath() {
      return !!this.$store.state.druxtRouter.route.isHomePath
    },
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

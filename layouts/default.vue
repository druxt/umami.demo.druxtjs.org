<template>
  <b-container fluid>
    <!-- Header -->
    <b-navbar class="bg-white p-3" toggleable="lg" sticky>
      <druxt-block-region name="header" :theme="theme" />
    </b-navbar>

    <!-- Banner: Top -->
    <druxt-block-region name="banner_top" :theme="theme" />

    <!-- Content -->
    <b-row class="bg-light">
      <b-container :class="containerClass">
        <!-- Breadcrumb -->
        <b-row v-if="!isHomePath">
          <b-col>
            <druxt-block-region name="breadcrumbs" :theme="theme" />
          </b-col>
        </b-row>

        <!-- Page title -->
        <b-row v-if="!isHomePath">
          <b-col class="mb-3 mb-md-5">
            <druxt-block-region name="page_title" :theme="theme" />
          </b-col>
        </b-row>

        <druxt-block-region :theme="theme" />
      </b-container>
    </b-row>

    <!-- Content: Bottom -->
    <b-row class="bg-secondary text-white">
      <b-container
        :class="containerClass.concat(['text-center', 'text-md-left'])"
      >
        <druxt-block-region name="content_bottom" :theme="theme" />
      </b-container>
    </b-row>

    <!-- Footer -->
    <b-row class="bg-dark text-white">
      <b-container
        :class="containerClass.concat(['text-center', 'text-md-left'])"
      >
        <druxt-block-region name="footer" :theme="theme" />
      </b-container>
    </b-row>

    <!-- Bottom -->
    <b-row>
      <b-container
        :class="containerClass.concat(['text-center', 'text-md-left'])"
      >
        <druxt-block-region name="bottom" :theme="theme" />
      </b-container>
    </b-row>
  </b-container>
</template>

<script>
export default {
  computed: {
    containerClass: () => ['mb-3', 'mt-3', 'mb-md-5', 'mt-md-5'],

    isHomePath() {
      return !!this.$store.state.druxtRouter.route.isHomePath
    },

    theme: () => 'umami',
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

<template>
  <b-container fluid>
    <!-- Header -->
    <DruxtBlockRegion
      name="header"
      theme="umami"
      :wrapper="{
        class: ['bg-white', 'p-3'],
        component: 'b-navbar',
        propsData: {
          sticky: true,
          toggleable: 'lg',
        },
      }"
    />

    <!-- Content -->
    <b-row class="bg-light">
      <b-container :class="containerClass">
        <slot v-if="$slots.default" />
        <Nuxt v-else />
      </b-container>
    </b-row>

    <!-- Footer -->
    <b-row class="bg-dark text-white">
      <b-container
        :class="containerClass.concat(['text-center', 'text-md-left'])"
      >
        <DruxtBlockRegion name="footer" theme="umami" />
      </b-container>
    </b-row>

    <!-- Bottom -->
    <b-row>
      <b-container
        :class="containerClass.concat(['text-center', 'text-md-left'])"
      >
        <DruxtBlockRegion name="bottom" theme="umami" />
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
  computed: {
    containerClass: () => ['mb-3', 'mt-3', 'mb-md-5', 'mt-md-5'],
  },
}
</script>

<style>
html {
  font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  word-spacing: 1px;
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

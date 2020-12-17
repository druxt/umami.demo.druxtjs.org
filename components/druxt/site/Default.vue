<template>
  <b-container fluid>
    <!-- Header -->
    <slot
      name="header"
      :wrapper="{
        class: ['bg-white', 'p-3'],
        component: 'b-navbar',
        propsData: {
          sticky: true,
          toggleable: 'lg',
        },
      }"
    />

    <!-- Banner: Top -->
    <slot name="banner_top" />

    <!-- Content -->
    <b-row class="bg-light">
      <b-container :class="containerClass">
        <!-- Breadcrumb -->
        <b-row v-if="!isHomePath">
          <b-col>
            <slot name="breadcrumbs" />
          </b-col>
        </b-row>

        <!-- Page title -->
        <b-row v-if="!isHomePath">
          <b-col class="mb-3 mb-md-5">
            <slot name="page_title" />
          </b-col>
        </b-row>

        <slot name="content" />
      </b-container>
    </b-row>

    <!-- Content: Bottom -->
    <b-row class="bg-secondary text-white">
      <b-container
        :class="containerClass.concat(['text-center', 'text-md-left'])"
      >
        <slot name="content_bottom" />
      </b-container>
    </b-row>

    <!-- Footer -->
    <b-row class="bg-dark text-white">
      <b-container
        :class="containerClass.concat(['text-center', 'text-md-left'])"
      >
        <slot name="footer" />
      </b-container>
    </b-row>

    <!-- Bottom -->
    <b-row>
      <b-container
        :class="containerClass.concat(['text-center', 'text-md-left'])"
      >
        <slot name="bottom" />
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

    isHomePath() {
      return !!this.$store.state.druxtRouter.route.isHomePath
    },
  },
}
</script>

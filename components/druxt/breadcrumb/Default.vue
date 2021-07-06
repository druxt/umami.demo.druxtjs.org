<template>
  <b-breadcrumb :items="items" />
</template>

<script>
import { DruxtBreadcrumbMixin } from 'druxt-breadcrumb'

export default {
  mixins: [DruxtBreadcrumbMixin],

  computed: {
    items() {
      return (this.crumbs || []).filter((item) => item.to !== '/')
    },
  },
}
</script>

<template>
  <div class="d-flex">
    <b-breadcrumb class="flex-fill" :items="items" />
    <Star
      v-if="entity"
      v-bind="entity"
      class="star ml-3"
    />
  </div>
</template>

<script>
import { DruxtBreadcrumbMixin } from 'druxt-breadcrumb'

export default {
  mixins: [DruxtBreadcrumbMixin],

  computed: {
    entity: ({ $store }) => ($store.state.druxtRouter.route.props || {}).type.startsWith('node--')
      ? $store.state.druxtRouter.route.props
      : false,
    items() {
      return (this.crumbs || []).filter((item) => item.to !== '/')
    },
  },
}
</script>

<style scoped>
.star {
  height: 3rem;
}
</style>

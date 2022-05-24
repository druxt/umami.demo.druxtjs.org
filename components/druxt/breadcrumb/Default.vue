<template>
  <b-breadcrumb :items="crumbs" />
</template>

<script>
import { DruxtBreadcrumbMixin } from 'druxt-breadcrumb'

export default {
  mixins: [DruxtBreadcrumbMixin]
}
</script>

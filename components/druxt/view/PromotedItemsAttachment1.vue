<template>
  <b-row class="h-100">
    <slot
      name="results"
      :wrapper="{
        component: 'b-col',
        props: {
          class: 'mb-3 mb-sm-0',
          cols: 12,
          sm: 6
        }
      }"
    />
  </b-row>
</template>

<script>
import { DruxtViewsViewMixin } from 'druxt-views'

export default {
  mixins: [DruxtViewsViewMixin],
}
</script>

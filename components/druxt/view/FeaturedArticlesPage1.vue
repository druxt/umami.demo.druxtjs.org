<template>
  <div>
    <!-- Header -->
    <b-row v-if="$scopedSlots.header">
      <b-col>
        <slot name="header" />
      </b-col>
    </b-row>

    <!-- Results. -->
    <b-row>
      <slot name="results" v-bind="{ wrapper }" />
    </b-row>
  </div>
</template>

<script>
import { DruxtViewsViewMixin } from 'druxt-views'

export default {
  mixins: [DruxtViewsViewMixin],

  computed: {
    wrapper: () => ({
      component: 'b-col',
      props: {
        class: 'mb-3',
        cols: 12,
        md: 4,
        sm: 6,
      },
    }),
  },
}
</script>

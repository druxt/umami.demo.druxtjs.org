<template>
  <div>
    <!-- Header -->
    <b-row v-if="$scopedSlots.header">
      <b-col>
        <h3 class="text-center"><slot name="header" /></h3>
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
        sm: 6,
      },
    }),
  },
}
</script>

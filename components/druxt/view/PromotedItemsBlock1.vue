<template>
  <b-row>
    <b-container class="mb-3 mt-3 mb-md-5 mt-md-5">
      <b-row>
        <slot name="results" :result="column" :wrapper="false" />

        <component :is="column.component" v-bind="column.propsData">
          <slot name="attachments_after" :wrapper="false" />
        </component>
      </b-row>
    </b-container>
  </b-row>
</template>

<script>
import { DruxtViewsViewMixin } from 'druxt-views'

export default {
  mixins: [DruxtViewsViewMixin],

  data: () => ({
    column: {
      component: 'b-col',
      propsData: {
        class: 'mb-3',
        cols: 12,
        lg: 6,
      },
    },
  }),
}
</script>

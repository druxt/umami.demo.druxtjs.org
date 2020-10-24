<template>
  <b-row>
    <b-container class="mb-3 mt-3 mb-md-5 mt-md-5">
      <b-row>
        <slot name="results" :wrapper="column" />

        <component
          :is="column.component"
          :class="column.class"
          v-bind="column.propsData"
        >
          <slot
            name="attachments_after"
            :wrapper="{ component: 'span' }"
          />
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
      class: 'mb-3',
      propsData: {
        cols: 12,
        lg: 6,
      },
    },
  }),
}
</script>

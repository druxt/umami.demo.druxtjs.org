<template>
  <component :is="wrapper.component" v-bind="wrapper.props" v-if="icon">
    <b-icon-puzzle font-scale="2" />

    <p class="mt-2">
      <span v-if="$scopedSlots['label-above']">
        {{ schema.label.text }}<br />
      </span>
      <span v-diff="textDiff(schema.id)" v-text="items[0]" />
    </p>
  </component>

  <component :is="wrapper.component" v-bind="wrapper.props" v-else>
    <b-badge pill :variant="variant"
      ><span v-diff="textDiff(schema.id)" v-text="items[0]"
    /></b-badge>
  </component>
</template>

<script>
import { BIconPuzzle } from 'bootstrap-vue'
import { DruxtFieldMixin } from 'druxt-entity'
import { draftDiffable } from '~/utils/draft-diff'

export default {
  components: { BIconPuzzle },

  mixins: [draftDiffable, DruxtFieldMixin],

  props: {
    icon: {
      type: Boolean,
      default: false,
    },
  },

  computed: {
    variant() {
      switch (this.items[0]) {
        case 'easy':
          return 'success'
        case 'medium':
          return 'warning'
        case 'hard':
          return 'danger'
      }
      return false
    },
  },
}
</script>

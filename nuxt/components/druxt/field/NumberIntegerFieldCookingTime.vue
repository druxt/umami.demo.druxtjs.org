<template>
  <component :is="wrapper.component" v-bind="wrapper.props">
    <b-icon icon="stopwatch" font-scale="2"></b-icon>
    <p class="mt-2">
      <span v-if="$scopedSlots['label-above']">
        {{ schema.label.text }}<br />
      </span>
      <span v-diff="textDiff(schema.id)" v-text="items[0]" /> minutes
    </p>
  </component>
</template>

<script>
import { BIcon, BIconStopwatch } from 'bootstrap-vue'
import { DruxtFieldMixin } from 'druxt-entity'
import { draftDiffable } from '~/utils/draft-diff'

export default {
  components: {
    BIcon,
    BIconStopwatch,
  },

  mixins: [draftDiffable, DruxtFieldMixin],
}
</script>

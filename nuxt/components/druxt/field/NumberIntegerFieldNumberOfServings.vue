<template>
  <component :is="wrapper.component" v-bind="wrapper.props">
    <b-icon icon="people" font-scale="2"></b-icon>
    <p class="mt-2">
      <span v-if="$scopedSlots['label-above']">
        {{ schema.label.text }}<br />
      </span>
      <span v-diff="textDiff(schema.id)" v-text="items[0]" />
    </p>
  </component>
</template>

<script>
import { BIcon, BIconPeople } from 'bootstrap-vue'
import { DruxtFieldMixin } from 'druxt-entity'
import { draftDiffable } from '~/utils/draft-diff'

export default {
  components: {
    BIcon,
    BIconPeople,
  },

  mixins: [draftDiffable, DruxtFieldMixin],
}
</script>

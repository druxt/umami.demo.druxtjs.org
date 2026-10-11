<template>
  <component :is="wrapper.component" v-bind="wrapper.props">
    <!-- Label: Above -->
    <div v-if="$scopedSlots['label-above']">
      <h3>{{ schema.label.text }}</h3>
    </div>

    <!-- Label: Inline -->
    <slot v-if="$scopedSlots['label-inline']" name="label-inline" />

    <!-- Items: each row marked against the line it replaced. -->
    <b-list-group>
      <b-list-group-item
        v-for="(row, key) of rows"
        :key="key"
        :class="{ 'list-group-item--removed': row.removed }"
      >
        <del
          v-if="row.removed"
          class="v-diff-del v-diff-del--block"
          v-text="row.text"
        />
        <span v-else v-diff="row.diff" v-text="row.text" />
      </b-list-group-item>
    </b-list-group>
  </component>
</template>

<script>
import { DruxtFieldMixin } from 'druxt-entity'
import { draftDiffable, listRows } from '~/utils/draft-diff'

export default {
  mixins: [draftDiffable, DruxtFieldMixin],
  computed: {
    rows() {
      return listRows(this.textDiff(this.schema.id), this.items)
    },
  },
}
</script>

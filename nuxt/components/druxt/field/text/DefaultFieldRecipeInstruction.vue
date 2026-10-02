<template>
  <component :is="wrapper.component" v-bind="wrapper.props">
    <h3 v-if="$scopedSlots['label-above']">{{ schema.label.text }}</h3>

    <!-- Each list item becomes a numbered step, marked against the step it
         replaced; a removed step stands unnumbered where it was. -->
    <ol v-if="list" class="method-steps">
      <li
        v-for="(row, key) of steps"
        :key="key"
        class="method-step"
        :class="{ 'method-step--removed': row.removed }"
      >
        <template v-if="row.removed">
          <span class="method-step__n" aria-hidden="true" />
          <del
            class="v-diff-del v-diff-del--block method-step__text"
            v-text="row.text"
          />
        </template>
        <template v-else>
          <span class="method-step__n">{{ row.n }}</span>
          <!-- eslint-disable vue/no-v-html -->
          <span v-diff="row.diff" class="method-step__text" v-html="row.item" />
          <!-- eslint-enable vue/no-v-html -->
        </template>
      </li>
    </ol>
    <!-- eslint-disable vue/no-v-html -->
    <div
      v-else
      v-diff="textDiff(schema.id)"
      class="method-prose"
      v-html="items[0].processed"
    />
    <!-- eslint-enable vue/no-v-html -->
  </component>
</template>

<script>
import { DruxtFieldMixin } from 'druxt-entity'
import { draftDiffable, listRows, plain } from '~/utils/draft-diff'

export default {
  mixins: [draftDiffable, DruxtFieldMixin],

  computed: {
    list() {
      return this.items[0].processed.match(/(?<=<li>).*?(?=<\/li>)/g)
    },
    steps() {
      let n = 0
      return listRows(this.textDiff(this.schema.id), this.list, plain).map(
        (row) => (row.removed ? row : { ...row, n: ++n })
      )
    },
  },
}
</script>

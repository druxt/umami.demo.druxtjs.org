<template>
  <component :is="wrapper.component" v-bind="wrapper.props">
    <h3 v-if="$scopedSlots['label-above']">{{ schema.label.text }}</h3>

    <!-- Each list item becomes a numbered step. -->
    <ol v-if="list" class="method-steps">
      <li v-for="(item, key) of list" :key="key" class="method-step">
        <span class="method-step__n">{{ key + 1 }}</span>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span
          v-diff="textDiff(schema.id)"
          class="method-step__text"
          v-html="item"
        />
      </li>
    </ol>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div
      v-else
      v-diff="textDiff(schema.id)"
      class="method-prose"
      v-html="items[0].processed"
    />
  </component>
</template>

<script>
import { DruxtFieldMixin } from 'druxt-entity'
import { draftDiffable } from '~/utils/draft-diff'

export default {
  mixins: [draftDiffable, DruxtFieldMixin],

  computed: {
    list() {
      return this.items[0].processed.match(/(?<=<li>).*?(?=<\/li>)/g)
    },
  },
}
</script>

<template>
  <component :is="wrapper.component" v-bind="wrapper.props">
    <h3 v-if="$scopedSlots['label-above']">{{ schema.label.text }}</h3>

    <!-- Each list item becomes a numbered step. -->
    <ol v-if="list" class="method-steps">
      <li v-for="(item, key) of list" :key="key" class="method-step">
        <span class="method-step__n">{{ key + 1 }}</span>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span class="method-step__text" v-html="item" />
      </li>
    </ol>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-else class="method-prose" v-html="items[0].processed" />
  </component>
</template>

<script>
import { DruxtFieldMixin } from 'druxt-entity'

export default {
  mixins: [DruxtFieldMixin],

  computed: {
    list() {
      return this.items[0].processed.match(/(?<=<li>).*?(?=<\/li>)/g)
    },
  },
}
</script>

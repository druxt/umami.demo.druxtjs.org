<template>
  <component :is="wrapper.component" v-bind="wrapper.props">
    <h3 v-if="$slots['label-above']">{{ schema.label.text }}</h3>

    <b-list-group v-if="list">
      <b-list-group-item v-for="(item, key) of list" :key="key" button>
        {{ item }}
      </b-list-group-item>
    </b-list-group>

    <span v-else v-html="items[0].processed" />
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

<template>
  <b-row>
    <b-col class="text-center" cols="12">
      <h2 v-text="view.data.attributes.label" />
    </b-col>

    <b-col v-for="result of results" :key="result.id" class="p-2" md="3">
      <b-link
        class="font-weight-bold text-white"
        component="strong"
        nuxt
        :to="`/${result.attributes.path.langcode}${(result.attributes.path || {}).alias}`"
      >
        {{ result.attributes.name }}
      </b-link>
    </b-col>
  </b-row>
</template>

<script>
import { DruxtViewsViewMixin } from 'druxt-views'

export default {
  mixins: [DruxtViewsViewMixin],

  druxt: {
    query: {
      fields: ['name', 'path'],
    },
  },
}
</script>

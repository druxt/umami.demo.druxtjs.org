<template>
  <b-row class="align-items-center">
    <b-col cols="12" md="4">
      <h2 class="mb-0">Recipe collections</h2>
    </b-col>

    <b-col cols="12" md="8" class="mt-3 mt-md-0">
      <div class="collections__list">
        <b-link
          v-for="result of results"
          :key="result.id"
          class="collections__link"
          nuxt
          :to="`/en${(result.attributes.path || {}).alias}`"
        >
          {{ result.attributes.name }}
        </b-link>
      </div>
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

<template>
  <b-row v-if="!$fetchState.pending">
    <b-col v-for="entity of entities" :key="entity.id" cols="4">
      <DruxtEntity :type="entity.type" :uuid="entity.id" mode="card" />
    </b-col>
  </b-row>
</template>

<script>
import { DrupalJsonApiParams } from 'drupal-jsonapi-params'
import { DruxtEntityMixin } from 'druxt-entity'
import { mapActions } from 'vuex'

export default {
  mixins: [DruxtEntityMixin],

  data: () => ({
    entities: [],
  }),

  async fetch() {
    this.entities = (
      await Promise.all(
        ['node--article', 'node--recipe'].map(
          async (type) =>
            (
              await this.getCollection({
                type,
                query: new DrupalJsonApiParams()
                  .addFilter('field_tags.id', this.entity.id, 'CONTAINS')
                  .addFields(type, []),
              })
            ).data
        )
      )
    ).flat()
  },

  methods: {
    ...mapActions({
      getCollection: 'druxt/getCollection',
    }),
  },

  druxt: {
    query: {
      schema: false,
      fields: ['drupal_internal__tid'],
    },
  },
}
</script>

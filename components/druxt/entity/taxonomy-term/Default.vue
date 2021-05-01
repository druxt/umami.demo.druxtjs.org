<template>
  <b-row v-if="!$fetchState.pending" class="align-items-stretch">
    <b-col
      v-for="entity of entities"
      :key="entity.id"
      class="mb-3"
      cols="12"
      sm="4"
    >
      <DruxtEntity
        class="h-100"
        :type="entity.type"
        :uuid="entity.id"
        mode="card"
      />
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
    entityTypes: [],
    field: '',
  }),

  async fetch() {
    this.entities = (
      await Promise.all(
        this.entityTypes.map(
          async (type) =>
            (
              await this.getCollection({
                type,
                query: new DrupalJsonApiParams()
                  .addFilter(`${this.field}.id`, this.entity.id, 'CONTAINS')
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
}
</script>

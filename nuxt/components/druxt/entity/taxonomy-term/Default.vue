<template>
  <div v-if="!$fetchState.pending" class="term-page">
    <!-- The page title block above already prints the term's name. -->
    <span class="term-page__kicker">Collection</span>
    <p class="term-page__blurb">{{ blurb }}</p>

    <div class="term-page__meta">
      <span v-for="chip of chips" :key="chip" class="term-page__chip">
        {{ chip }}
      </span>
    </div>

    <b-row class="align-items-stretch">
      <b-col
        v-for="entity of entities"
        :key="entity.id"
        class="mb-4"
        cols="6"
        md="4"
        lg="3"
      >
        <DruxtEntity
          class="h-100"
          :type="entity.type"
          :uuid="entity.id"
          mode="card"
        />
      </b-col>
    </b-row>
  </div>
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

  computed: {
    counts() {
      return this.entityTypes.map((type) => ({
        label: type.split('--').pop(),
        total: this.entities.filter((entity) => entity.type === type).length,
      }))
    },

    /** "18 recipes and 4 articles filed under this term." */
    blurb() {
      const parts = this.counts
        .filter(({ total }) => total)
        .map(({ label, total }) => `${total} ${label}${total === 1 ? '' : 's'}`)
      if (!parts.length) {
        return 'Nothing is filed under this term yet.'
      }
      return `${parts.join(' and ')} filed under this term.`
    },

    chips() {
      return this.counts
        .filter(({ total }) => total)
        .map(
          ({ label, total }) =>
            `${label.charAt(0).toUpperCase()}${label.slice(1)}s ${total}`
        )
    },
  },

  methods: {
    ...mapActions({
      getCollection: 'druxt/getCollection',
    }),
  },
}
</script>

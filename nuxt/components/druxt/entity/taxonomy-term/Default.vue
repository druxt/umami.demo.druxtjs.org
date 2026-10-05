<template>
  <!-- Every term reference on the site resolves to this component: with no
       term view display, a card's kicker asking for a term label lands here
       too. Build the term page only for the term the router actually
       resolved; anywhere else this is a name. -->
  <span v-if="!isRoutedTerm">{{ entity.attributes.name }}</span>

  <div v-else class="term-page">
    <!-- The head band: breadcrumb, kicker, name, description and the count. -->
    <div class="term-head bleed">
      <b-container class="term-head__inner">
        <DruxtBreadcrumb />
        <span class="term-head__kicker">Collection</span>
        <h1 class="term-head__title">{{ entity.attributes.name }}</h1>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="description" class="term-head__blurb" v-html="description" />
        <span class="term-head__count">{{ count }}</span>
      </b-container>
    </div>

    <div v-if="entities.length" class="card-grid">
      <DruxtEntity
        v-for="item of entities"
        :key="item.id"
        mode="card"
        :type="item.type"
        :uuid="item.id"
      />
    </div>
    <p v-else-if="!$fetchState.pending" class="term-page__empty">
      Nothing is filed under this term yet.
    </p>

    <AppDruxtNote
      class="term-page__note"
      file="entity/taxonomy-term/tags/Default.vue"
      kicker="How this works"
    >
      The term page is one entity plus one view, both resolved by the router
      from the URL alias. Term description, then the referencing content in card
      view mode.
    </AppDruxtNote>
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
    if (!this.isRoutedTerm) {
      return
    }
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
    /** True only when this term is the one the router resolved. */
    isRoutedTerm() {
      const route = this.$store.state.druxtRouter.route || {}
      return ((route.entity || {}).uuid || null) === this.entity.id
    },

    description: ({ entity }) =>
      ((entity.attributes || {}).description || {}).processed || '',

    /** "18 recipes and 4 articles", as the count line under the name. */
    count() {
      const parts = this.entityTypes
        .map((type) => ({
          label: type.split('--').pop(),
          total: this.entities.filter((entity) => entity.type === type).length,
        }))
        .filter(({ total }) => total)
        .map(({ label, total }) => `${total} ${label}${total === 1 ? '' : 's'}`)
      return parts.length ? parts.join(' and ') : ''
    },
  },

  methods: {
    ...mapActions({
      getCollection: 'druxt/getCollection',
    }),
  },

  druxt: {
    query: {
      fields: ['description', 'name', 'path'],
    },
  },
}
</script>

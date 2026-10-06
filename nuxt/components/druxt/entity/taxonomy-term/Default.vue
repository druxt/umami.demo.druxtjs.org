<template>
  <!-- Every term reference on the site resolves to this component: with no
       term view display, a card's kicker asking for a term label lands here
       too. Build the term page only for the term the router actually
       resolved. Asked for its label, a term is a name; rendered as an
       entity, as Drupal's "Rendered entity" formatter does, it is its name
       linked to its page and its description. -->
  <span v-if="!isRoutedTerm && mode === 'label'">{{
    entity.attributes.name
  }}</span>

  <div v-else-if="!isRoutedTerm" class="term-rendered">
    <NuxtLink class="term-rendered__name" :to="path">{{
      entity.attributes.name
    }}</NuxtLink>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="description" class="term-rendered__body" v-html="description" />
  </div>

  <div v-else class="term-page">
    <!-- The head band: breadcrumb, kicker, name, description and the count. -->
    <div class="term-head bleed">
      <b-container class="term-head__inner">
        <DruxtBreadcrumb />
        <span class="term-head__kicker">{{ $t('term.collection') }}</span>
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
      {{ $t('term.empty') }}
    </p>

    <AppDruxtNote
      class="term-page__note"
      file="entity/taxonomy-term/tags/Default.vue"
      :kicker="$t('note.howThisWorks')"
      >{{ $t('note.termBody') }}</AppDruxtNote
    >
  </div>
</template>

<script>
import { DrupalJsonApiParams } from 'drupal-jsonapi-params'
import { DruxtEntityMixin } from 'druxt-entity'
import { mapActions } from 'vuex'
import { langMixin } from '~/utils/lang'

export default {
  mixins: [langMixin, DruxtEntityMixin],

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

    /** The mode the enclosing DruxtEntity was asked for. */
    mode() {
      let vm = this.$parent
      while (vm && vm.$options.name !== 'DruxtEntity') vm = vm.$parent
      return (vm && vm.mode) || 'default'
    },

    path: ({ entity, prefix }) =>
      `${prefix}${((entity.attributes || {}).path || {}).alias || ''}`,

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
        .map(({ label, total }) =>
          this.$tc(
            label === 'article' ? 'term.countArticles' : 'term.countRecipes',
            total,
            { n: total }
          )
        )
      return parts.length ? parts.join(` ${this.$t('term.and')} `) : ''
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

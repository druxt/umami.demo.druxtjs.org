<template>
  <!-- The kicker is the category's name, fetched by the card. Rendering the
       reference field would put a second card inside this one, because the
       referenced entity resolves back to a card. The meta line, time then
       difficulty, is read off the entity for the same reason. -->
  <UmamiCard
    :kicker="kicker || ''"
    :meta="meta"
    :title="entity.attributes.title"
    :to="to"
  >
    <template #media>
      <EntityScope :entity="entity">
        <slot name="field_media_image" />
      </EntityScope>
    </template>
  </UmamiCard>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'
import { mapActions } from 'vuex'
import EntityScope from '~/utils/entity-scope'
import { langMixin } from '~/utils/lang'

// Under entity/node/ deliberately. As entity/Card.vue this registered as
// DruxtEntityCard, the catch-all for anything rendered in card mode: a
// taxonomy term with no card display of its own matched it too, and rendered
// a second, image-less card inside the first card's kicker.

export default {
  components: { EntityScope },

  mixins: [langMixin, DruxtEntityMixin],

  data: () => ({
    kicker: null,
  }),

  async fetch() {
    const data =
      ((this.entity.relationships || {}).field_recipe_category || {}).data || []
    const term = Array.isArray(data) ? data[0] : data
    if (!term) {
      return
    }
    // In the page's language: a Spanish card names its category in Spanish.
    const resource = await this.getResource({
      ...term,
      prefix: this.lang,
      query: { fields: { [term.type]: 'name' } },
    })
    this.kicker = ((resource || {}).data || {}).attributes?.name || null
  },

  computed: {
    /* @todo - Implement proper multilingual support */
    to: ({ entity, prefix }) =>
      `${prefix}${(entity.attributes.path || {}).alias}`,

    /** "45 min · Medium", or either half on its own. */
    meta() {
      const minutes = this.entity.attributes.field_cooking_time || 0
      const difficulty = this.entity.attributes.field_difficulty || ''
      const time =
        minutes >= 60
          ? `${Math.floor(minutes / 60)} hr${
              minutes % 60 ? ` ${minutes % 60}` : ''
            }`
          : minutes && this.$t('recipe.min', { n: minutes })
      return [time, difficulty && this.$t(`listing.${difficulty}`)]
        .filter(Boolean)
        .join(' · ')
    },
  },

  methods: {
    ...mapActions({
      getResource: 'druxt/getResource',
    }),
  },

  druxt: {
    // Attributes only: a relationship here would render its entity, and an
    // entity inside a card resolves to another card.
    query: {
      fields: [
        'field_cooking_time',
        'field_difficulty',
        'field_recipe_category',
        'path',
        'title',
      ],
    },
  },
}
</script>

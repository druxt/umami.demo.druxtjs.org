<template>
  <nuxt-link class="recipe-card" :to="to">
    <slot name="field_media_image" />

    <div class="recipe-card__body">
      <!-- The category's name, fetched by the card. Rendering the reference
           field would put a second card inside this one, because the
           referenced entity resolves back to a card. -->
      <span v-if="kicker" class="recipe-card__kicker">{{ kicker }}</span>

      <h2 class="recipe-card__title">{{ entity.attributes.title }}</h2>

      <!-- One meta line: time then difficulty. Read off the entity, because a
           field slot renders the referenced entity, and an entity rendered
           inside a card resolves to a card again. -->
      <p v-if="meta" class="recipe-card__meta">{{ meta }}</p>
    </div>
  </nuxt-link>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'
import { mapActions } from 'vuex'
import { langMixin } from '~/utils/lang'

// Under entity/node/ deliberately. As entity/Card.vue this registered as
// DruxtEntityCard, the catch-all for anything rendered in card mode: a
// taxonomy term with no card display of its own matched it too, and rendered
// a second, image-less card inside the first card's kicker.

export default {
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

<style scoped>
/* The whole card is the link now, so the old click handler and the
   cursor: pointer on every descendant are gone. */
.recipe-card,
.recipe-card:hover {
  color: inherit;
  text-decoration: none;
}
</style>

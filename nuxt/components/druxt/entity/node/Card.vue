<template>
  <nuxt-link class="recipe-card" :to="to">
    <slot name="field_media_image" />

    <div class="recipe-card__body">
      <!-- The category kicker is on hold: rendering the reference field puts
           a second, empty card inside this one, because the referenced
           entity resolves back to a card. It needs the term's name in the
           card's own query, not a field slot. -->

      <h3 class="recipe-card__title">{{ entity.attributes.title }}</h3>

      <!-- One meta line: time then difficulty. Read off the entity, because a
           field slot renders the referenced entity, and an entity rendered
           inside a card resolves to a card again. -->
      <p v-if="meta" class="recipe-card__meta">{{ meta }}</p>
    </div>
  </nuxt-link>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

// Under entity/node/ deliberately. As entity/Card.vue this registered as
// DruxtEntityCard, the catch-all for anything rendered in card mode: a
// taxonomy term with no card display of its own matched it too, and rendered
// a second, image-less card inside the first card's kicker.

export default {
  mixins: [DruxtEntityMixin],

  computed: {
    /* @todo - Implement proper multilingual support */
    to: ({ entity }) => `/en${(entity.attributes.path || {}).alias}`,

    /** "45 min · Medium", or either half on its own. */
    meta() {
      const minutes = this.entity.attributes.field_cooking_time || 0
      const difficulty = this.entity.attributes.field_difficulty || ''
      const time =
        minutes >= 60
          ? `${Math.floor(minutes / 60)} hr${
              minutes % 60 ? ` ${minutes % 60}` : ''
            }`
          : minutes && `${minutes} min`
      return [
        time,
        difficulty && difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      ]
        .filter(Boolean)
        .join(' · ')
    },
  },

  druxt: {
    // Attributes only: a relationship here would render its entity, and an
    // entity inside a card resolves to another card.
    query: {
      fields: ['field_cooking_time', 'field_difficulty', 'path', 'title'],
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

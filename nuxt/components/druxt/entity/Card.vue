<template>
  <nuxt-link class="recipe-card" :to="to">
    <slot name="field_media_image" />

    <div class="recipe-card__body">
      <span v-if="$scopedSlots.field_recipe_category" class="kicker">
        <slot name="field_recipe_category" />
      </span>

      <h3 class="recipe-card__title">{{ entity.attributes.title }}</h3>

      <!-- Read straight off the entity rather than through a field slot: a
           slot renders the referenced entity, and an entity rendered inside a
           card resolves to a card again. Difficulty, time and the standfirst
           are plain attributes, so they are safe to print. -->
      <p v-if="summary" class="recipe-card__summary">{{ summary }}</p>

      <div v-else-if="difficulty || minutes" class="recipe-card__meta">
        <b-badge v-if="difficulty" :variant="variant">{{ difficulty }}</b-badge>
        <span v-if="minutes">{{ minutes }} min</span>
      </div>
    </div>
  </nuxt-link>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

const LIMIT = 130

const VARIANTS = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
}

export default {
  mixins: [DruxtEntityMixin],

  computed: {
    /* @todo - Implement proper multilingual support */
    to: ({ entity }) => `/en${(entity.attributes.path || {}).alias}`,

    difficulty: ({ entity }) => entity.attributes.field_difficulty || '',

    minutes: ({ entity }) => entity.attributes.field_cooking_time || 0,

    variant: ({ difficulty }) => VARIANTS[difficulty.toLowerCase()] || 'info',

    /** An article's standfirst, trimmed: the body itself would fill a page. */
    summary() {
      const body = this.entity.attributes.field_body || {}
      const text = (body.summary || body.processed || body.value || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (!text || text.length <= LIMIT) {
        return text
      }
      return `${text.slice(0, text.lastIndexOf(' ', LIMIT))}…`
    },
  },

  druxt: {
    // Attributes only. Adding a relationship here (tags, category) makes the
    // card render that entity, which resolves to a card inside the card.
    query: {
      fields: [
        'field_body',
        'field_cooking_time',
        'field_difficulty',
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

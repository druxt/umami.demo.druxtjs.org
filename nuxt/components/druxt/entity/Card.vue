<template>
  <nuxt-link class="recipe-card" :to="to">
    <slot name="field_media_image" />

    <div class="recipe-card__body">
      <span v-if="$scopedSlots.field_recipe_category" class="kicker">
        <slot name="field_recipe_category" />
      </span>

      <h3 class="recipe-card__title">{{ entity.attributes.title }}</h3>

      <div class="recipe-card__meta">
        <slot name="field_difficulty" />
        <slot name="field_cooking_time" />
      </div>
    </div>
  </nuxt-link>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  mixins: [DruxtEntityMixin],

  computed: {
    /* @todo - Implement proper multilingual support */
    to: ({ entity }) => `/en${(entity.attributes.path || {}).alias}`,
  },

  druxt: {
    query: {
      fields: ['path', 'title'],
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

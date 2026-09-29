<template>
  <nuxt-link class="teaser" :to="to">
    <!-- The photograph carries everything: the meta chip on top, the kicker
         and headline on a scrim at the foot. Nothing sits below the image,
         which is what tells a teaser from a card. -->
    <div class="teaser__media">
      <slot name="field_media_image" />

      <span v-if="meta" class="teaser__meta">{{ meta }}</span>

      <div class="teaser__scrim" />

      <div class="teaser__text">
        <span v-if="kicker" class="teaser__kicker">{{ kicker }}</span>
        <h3 class="teaser__title">{{ entity.attributes.title }}</h3>
      </div>
    </div>
  </nuxt-link>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'
import { mapActions } from 'vuex'

export default {
  mixins: [DruxtEntityMixin],

  data: () => ({
    category: null,
  }),

  /** A recipe's kicker is its category, which the teaser fetches by name. */
  async fetch() {
    const data =
      ((this.entity.relationships || {}).field_recipe_category || {}).data || []
    const term = Array.isArray(data) ? data[0] : data
    if (!term) {
      return
    }
    const resource = await this.getResource({
      ...term,
      query: { fields: { [term.type]: 'name' } },
    })
    this.category = ((resource || {}).data || {}).attributes?.name || null
  },

  computed: {
    /* @todo - Implement proper multilingual support */
    to: ({ entity }) => `/en${(entity.attributes.path || {}).alias}`,

    isRecipe: ({ entity }) => entity.type === 'node--recipe',

    /** The category for a recipe; the type for anything else. */
    kicker() {
      if (this.isRecipe) {
        return this.category
      }
      const bundle = (this.entity.type || '').split('--').pop() || ''
      return bundle.charAt(0).toUpperCase() + bundle.slice(1)
    },

    /** "40 min · Medium" for a recipe, "4 min read" for an article. */
    meta() {
      const a = this.entity.attributes || {}
      if (this.isRecipe) {
        const difficulty = a.field_difficulty || ''
        return [
          a.field_cooking_time && `${a.field_cooking_time} min`,
          difficulty &&
            difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
        ]
          .filter(Boolean)
          .join(' · ')
      }
      const html = (a.field_body || {}).processed || ''
      if (!html) {
        return ''
      }
      const words = html
        .replace(/<[^>]+>/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
      return `${Math.max(1, Math.round(words.length / 200))} min read`
    },
  },

  methods: {
    ...mapActions({
      getResource: 'druxt/getResource',
    }),
  },

  druxt: {
    // Attributes only: a relationship here would render its entity, and an
    // entity inside a teaser resolves to another teaser.
    query: {
      fields: [
        'field_body',
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

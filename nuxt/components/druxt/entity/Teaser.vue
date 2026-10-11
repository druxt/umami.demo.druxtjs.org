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
import { langMixin } from '~/utils/lang'

export default {
  mixins: [langMixin, DruxtEntityMixin],

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
    // In the page's language: a Spanish card names its category in Spanish.
    const resource = await this.getResource({
      ...term,
      prefix: this.lang,
      query: { fields: { [term.type]: 'name' } },
    })
    this.category = ((resource || {}).data || {}).attributes?.name || null
  },

  computed: {
    /* @todo - Implement proper multilingual support */
    to: ({ entity, prefix }) =>
      `${prefix}${(entity.attributes.path || {}).alias}`,

    isRecipe: ({ entity }) => entity.type === 'node--recipe',

    /** The category for a recipe; the type for anything else. */
    kicker() {
      if (this.isRecipe) {
        return this.category
      }
      const bundle = (this.entity.type || '').split('--').pop() || ''
      return this.$te(`bundle.${bundle}`) ? this.$t(`bundle.${bundle}`) : bundle
    },

    /** "40 min · Medium" for a recipe, "4 min read" for an article. */
    meta() {
      const a = this.entity.attributes || {}
      if (this.isRecipe) {
        const difficulty = a.field_difficulty || ''
        return [
          a.field_cooking_time &&
            this.$t('recipe.min', { n: a.field_cooking_time }),
          difficulty && this.$t(`listing.${difficulty}`),
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
      return this.$t('article.readTime', {
        n: Math.max(1, Math.round(words.length / 200)),
      })
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

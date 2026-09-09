<template>
  <nuxt-link class="teaser" :to="to">
    <div class="teaser__media">
      <slot name="field_media_image" />
    </div>

    <span class="teaser__kicker">{{ kicker }}</span>

    <h3 class="teaser__title">{{ entity.attributes.title }}</h3>
  </nuxt-link>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  mixins: [DruxtEntityMixin],

  computed: {
    /* @todo - Implement proper multilingual support */
    to: ({ entity }) => `/en${(entity.attributes.path || {}).alias}`,

    /** The strip mixes content types, so the kicker names the type. */
    kicker: ({ entity }) => (entity.type || '').split('--').pop() || '',
  },

  druxt: {
    query: {
      fields: ['path', 'title'],
    },
  },
}
</script>

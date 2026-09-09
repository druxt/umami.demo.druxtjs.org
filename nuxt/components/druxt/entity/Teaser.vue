<template>
  <nuxt-link class="teaser" :to="to">
    <div class="teaser__media">
      <slot name="field_media_image" />
    </div>

    <div class="teaser__body">
      <span v-if="$scopedSlots.field_tags" class="teaser__kicker">
        <slot name="field_tags" />
      </span>

      <h3 class="teaser__title">{{ entity.attributes.title }}</h3>
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
    // The image and the tags are on the teaser display, but a fields filter
    // that omits them means the query never asks Drupal for either, so the
    // strip rendered as three bare headlines.
    query: {
      fields: ['field_media_image', 'field_tags', 'path', 'title'],
    },
  },
}
</script>

<template>
  <nuxt-link
    class="d-flex align-items-start"
    style="color: inherit; gap: 0.875rem"
    :to="to"
  >
    <div style="flex: 0 0 92px">
      <slot name="field_media_image" />
    </div>

    <div class="d-flex flex-column" style="gap: 0.3125rem">
      <h4 style="font-size: 1.0625rem; margin: 0">
        {{ entity.attributes.title }}
      </h4>
      <span style="font-size: 0.75rem; color: #8a7f70">
        <slot name="field_tags" />
      </span>
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
a:hover {
  text-decoration: none;
}

a:hover h4 {
  color: #7d4a1a;
}
</style>

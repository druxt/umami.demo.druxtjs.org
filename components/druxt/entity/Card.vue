<template>
  <b-card
    :class="{ 'h-100': true, shadow: hover }"
    tag="article"
    no-body
    @click="$router.push({ path: to })"
    @mouseover="hover = true"
    @mouseleave="hover = false"
  >
    <slot name="field_media_image" />

    <b-card-body class="h-100 d-flex flex-column">
      <b-card-title>{{ entity.attributes.title }}</b-card-title>

      <b-card-sub-title v-if="$scopedSlots.field_difficulty" class="mb-3">
        <slot name="field_difficulty" />
      </b-card-sub-title>

      <b-button
        block
        :class="{ 'mt-auto': true, shadow: hover }"
        nuxt
        :to="to"
        :variant="hover ? 'primary' : 'secondary'"
      >
        {{ buttonText }} <b-icon-arrow-right />
      </b-button>
    </b-card-body>
  </b-card>
</template>

<script>
import { BIconArrowRight } from 'bootstrap-vue'
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  components: { BIconArrowRight },

  mixins: [DruxtEntityMixin],

  data: () => ({
    hover: false,
  }),

  computed: {
    buttonText: ({ schema, langcode }) => ({
      'en': `View ${schema.config.bundle}`,
      'es': `Ver ${schema.config.bundle}`
    }[langcode || 'en']),

    to: ({ entity }) => `/${entity.attributes.path.langcode}${(entity.attributes.path || {}).alias}`,
  },

  druxt: {
    query: {
      fields: ['path', 'title'],
    },
  },
}
</script>

<style scoped>
* {
  cursor: pointer;
}
</style>

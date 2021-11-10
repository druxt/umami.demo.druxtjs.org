<template>
  <b-card
    :class="{ 'h-100': true, shadow: hover }"
    tag="article"
    no-body
    @click="$router.push({ path: to })"
    @mouseover="hover = true"
    @mouseleave="hover = false"
  >
    <Star
      class="position-absolute star"
      pill
      :type="model.type"
      :uuid="model.id"
    />
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
        View {{ schema.config.bundle }} <b-icon-arrow-right />
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
    /* @todo - Implement proper multilingual support */
    to: ({ entity }) => `/en${entity.attributes.path.alias}`,
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

.star {
  top: 1rem;
  right: 1rem;
}
</style>

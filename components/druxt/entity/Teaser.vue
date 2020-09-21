<template>
  <b-card
    :class="{
      'h-100': true,
      'overflow-hidden': true,
      'p-0': true,
      shadow: hover,
      'w-100': true,
    }"
    no-body
    tag="article"
    @click="$router.push({ path: to })"
    @mouseover="hover = true"
    @mouseleave="hover = false"
  >
    <b-row no-gutters>
      <b-col cols="6" md="12" xl="6">
        <slot name="field_media_image" />
      </b-col>

      <b-col cols="6" md="12" xl="6">
        <b-card-body :title="entity.attributes.title" title-tag="h6">
          <slot name="field_tags" />
        </b-card-body>
      </b-col>
    </b-row>
  </b-card>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  mixins: [DruxtEntityMixin],

  data: () => ({
    hover: false,
  }),

  computed: {
    to() {
      return this.entity.attributes.path.alias
    },
  },
}
</script>

<style scoped>
* {
  cursor: pointer;
}
</style>

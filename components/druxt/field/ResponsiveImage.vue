<template>
  <component
    :is="wrapper.component"
    v-if="entities && typeof entities[0] !== 'undefined'"
    v-bind="wrapper.props"
  >
    <!-- Label: Above -->
    <div v-if="$slots['label-above']">
      <slot name="label-above" />
    </div>

    <!-- Label: Inline -->
    <slot v-if="$slots['label-inline']" name="label-inline" />

    <!-- Items -->
    <b-card-img-lazy
      v-for="entity of entities"
      :key="entity.id"
      :src="
        entity.attributes.uri.value.replace(
          'public://',
          '/sites/default/files/'
        )
      "
    />
  </component>
</template>

<script>
import { DruxtFieldResponsiveImage } from 'druxt-entity'

export default {
  extends: DruxtFieldResponsiveImage,
}
</script>

<style scoped>
img {
  width: 100%;
}
</style>

<template>
  <component :is="wrapper.component" v-if="!$fetchState.pending">
    <!-- Label: Above -->
    <div v-if="$slots['label-above']">
      <slot name="label-above" />
    </div>

    <!-- Label: Inline -->
    <slot v-if="$slots['label-inline']" name="label-inline" />

    <!-- Items -->
    <component
      :is="component"
      v-for="(entity, key) of entities"
      :key="key"
      class="mr-1"
      v-bind="entity.props || false"
    >
      <b-badge variant="info">{{ entity.text }}</b-badge>
    </component>
  </component>
</template>

<script>
import { DruxtFieldEntityReferenceLabel } from 'druxt-entity'

export default {
  extends: DruxtFieldEntityReferenceLabel,
}
</script>

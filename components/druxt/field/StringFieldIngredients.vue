<template>
  <component :is="wrapper.component" v-bind="wrapper.props">
    <!-- Label: Above -->
    <div v-if="$slots['label-above']">
      <h3>{{ schema.label.text }}</h3>
    </div>

    <!-- Label: Inline -->
    <slot v-if="$slots['label-inline']" name="label-inline" />

    <!-- Items -->
    <b-list-group>
      <b-list-group-item v-for="(item, key) of items" :key="key">
        {{ item }}
      </b-list-group-item>
    </b-list-group>
  </component>
</template>

<script>
import { DruxtFieldString } from 'druxt-entity'

export default {
  name: 'DruxtFieldStringFieldIngredients',

  extends: DruxtFieldString,
}
</script>

<template>
  <div v-if="resolved.length" class="druxt-ice-toolbar">
    <button
      v-for="feature in resolved"
      :key="feature.id"
      type="button"
      class="druxt-ice-toolbar__button"
      @click="$emit('action', feature.id)"
    >
      {{ feature.label }}
    </button>
  </div>
</template>

<script>

// siroc builds this component to dist/components, standalone from the
// bundled dist/index.*.js. A relative import out of that directory has
// nothing beside it to resolve. The package name is the only specifier that
// reaches the module from both the source tree and the built output.
import { resolveFeatures } from '@druxt-contrib/inline-content-edit'

/**
 * The toolbar shell: one button per feature that survived negotiation.
 *
 * This component knows nothing about editing, diffing or block placement.
 * `resolveFeatures` already decided what is possible; this only draws a
 * button for what came back and reports which one was pressed. With
 * nothing resolved it renders nothing at all, not an empty bar.
 */
export default {
  name: 'DruxtIceToolbar',

  props: {
    features: { type: Array, default: () => [] },
    adapter: { type: Object, default: null },
    context: { type: Object, default: () => ({}) },
  },

  computed: {
    resolved() {
      return resolveFeatures(this.features, this.adapter, this.context)
    },
  },
}
</script>

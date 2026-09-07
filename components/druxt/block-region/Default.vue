<template>
  <div>
    <template v-for="key of Object.keys($scopedSlots)">
      <slot v-if="isVisible(key)" :name="key" />
    </template>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { DruxtBlocksRegionMixin } from 'druxt-blocks'

export default {
  mixins: [DruxtBlocksRegionMixin],

  computed: {
    ...mapState({
      route: (state) => state.druxtRouter.route,
    }),
  },

  methods: {
    isVisible(key) {
      const block = this.blocks.find((o) => o.attributes.drupal_internal__id === key) || {}
      // Request path visibility conditions.
      if (((block.attributes || {}).visibility || {}).request_path) {
        let visible = false
        const { negate } = block.attributes.visibility.request_path
        const pages = block.attributes.visibility.request_path.pages.split(/\r?\n/).filter(i => i)
        const route = this.route
        // Remove the language prefix from the resolved path.
        // @see https://github.com/druxt/demo.druxtjs.org/issues/417
        route.resolvedPath = route.resolvedPath.replace('/en', '')
        if (pages.includes('<front>') && (route.isHomePath || (!route.isHomePath && negate))) {
          visible = true
        }
        if (pages.includes(route.resolvedPath) || (!pages.includes(route.resolvedPath) && negate)) {
          visible = true
        }
        return visible
      }
      return false
    }
  }
}
</script>

<template>
  <div>
    <slot name="umami_banner_home" v-if="route.isHomePath" />
    <slot name="views_block__promoted_items_block_1" v-if="route.isHomePath" />
    <slot
      name="umami_banner_recipes"
      v-if="route.resolvedPath === '/en/recipes'"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  computed: {
    ...mapState({
      route: (state) => state.druxtRouter.route,
    }),
  },
}
</script>

<template>
  <div>
    <slot v-if="route.isHomePath" name="umami_banner_home" />
    <slot v-if="route.isHomePath" name="views_block__promoted_items_block_1" />
    <slot
      v-if="route.resolvedPath === '/en/recipes'"
      name="umami_banner_recipes"
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

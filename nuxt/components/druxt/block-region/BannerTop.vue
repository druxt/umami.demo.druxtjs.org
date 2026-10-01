<template>
  <div>
    <slot v-if="front" name="umami_banner_home" />
    <slot v-if="front" name="umami_views_block__promoted_items_block_1" />
    <slot
      v-if="/^\/(en|es)\/recipes$/.test(route.resolvedPath || '')"
      name="umami_banner_recipes"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { isFront } from '~/utils/front'

export default {
  computed: {
    ...mapState({
      route: (state) => state.druxtRouter.route,
    }),

    front() {
      return isFront(this.route, this.$route.path)
    },
  },
}
</script>

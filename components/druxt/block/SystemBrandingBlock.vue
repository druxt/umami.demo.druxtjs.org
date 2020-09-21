<template>
  <b-navbar-brand to="/">
    <b-img v-if="settings.use_site_logo" :src="src" />
  </b-navbar-brand>
</template>

<script>
import { DruxtBlocksBlockMixin } from 'druxt-blocks'

export default {
  mixins: [DruxtBlocksBlockMixin],

  computed: {
    src() {
      return 'https://dev-druxt.pantheonsite.io/core/profiles/demo_umami/themes/umami/logo.svg'
    },
  },
}
</script>

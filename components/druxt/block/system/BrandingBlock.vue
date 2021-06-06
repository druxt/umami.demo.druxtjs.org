<template>
  <b-navbar-brand to="/">
    <b-img :src="src" />
  </b-navbar-brand>
</template>

<script>
import { DruxtBlocksBlockMixin } from 'druxt-blocks'

export default {
  mixins: [DruxtBlocksBlockMixin],

  computed: {
    src() {
      return '/core/profiles/demo_umami/themes/umami/logo.svg'
    },
  },
}
</script>

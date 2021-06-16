<template>
  <b-card-img v-if="!$fetchState.pending" v-bind="props" />
</template>

<script>
import ResponsiveImage from './ResponsiveImageDefault.vue'

export default {
  name: 'ResponsiveImageFieldMediaImage',

  extends: ResponsiveImage,

  computed: {
    props() {
      return {
        src: this.$config.baseUrl + this.entities[0].data.attributes.uri.url,
        top: true,
      }
    },
  },
}
</script>

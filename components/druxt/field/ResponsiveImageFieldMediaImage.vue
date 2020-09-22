<template>
  <b-card-img v-if="!$fetchState.pending" v-bind="props" />
</template>

<script>
import ResponsiveImage from './ResponsiveImage.vue'

export default {
  name: 'ResponsiveImageFieldMediaImage',

  extends: ResponsiveImage,

  computed: {
    props() {
      return {
        src: this.entities[0].attributes.uri.url,
        top: true,
      }
    },
  },
}
</script>

<template>
  <component :is="component" v-bind="route.props" />
</template>

<script>
import { DruxtRouterMixin } from 'druxt-router'

export default {
  mixins: [DruxtRouterMixin],

  computed: {
    component() {
      return this.route.props.type !== 'contact_form--contact_form'
        ? 'druxt-entity'
        : 'druxt-contact'
    },
  },
}
</script>

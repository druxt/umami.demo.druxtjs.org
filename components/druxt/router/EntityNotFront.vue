<template>
  <!-- <b-tabs v-if="$auth.loggedIn"> -->
  <b-tabs>
    <b-tab title="View" class="mt-3">
      <component :is="component" v-bind="route.props" />
    </b-tab>
    <!-- <b-tab v-if="$auth.loggedIn" title="Edit" class="mt-3"> -->
    <b-tab
      v-if="route.props.type !== 'contact_form--contact_form'"
      title="Edit"
      class="mt-3"
    >
      <DruxtEntityForm v-bind="route.props" />
    </b-tab>
  </b-tabs>

  <!-- <component :is="component" v-else v-bind="route.props" /> -->
</template>

<script>
import Vue from 'vue'
import { TabsPlugin } from 'bootstrap-vue'
import { DruxtEntityForm } from 'druxt-entity'
import { DruxtRouterMixin } from 'druxt-router'

Vue.use(TabsPlugin)

export default {
  components: { DruxtEntityForm },

  mixins: [DruxtRouterMixin],

  computed: {
    component() {
      if (this.mode === 'form') {
        return 'druxt-entity-form'
      }
      return this.route.props.type !== 'contact_form--contact_form'
        ? 'druxt-entity'
        : 'druxt-contact'
    },
  },
}
</script>

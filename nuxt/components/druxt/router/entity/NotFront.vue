<template>
  <!-- The tab bar is the demo's teaching layer: the same entity rendered and
       edited. A contact form has no edit mode, so it was left showing a lone
       "View" tab. -->
  <b-tabs v-if="editable">
    <b-tab title="View" class="mt-3">
      <component :is="component" v-bind="route.props" />
    </b-tab>

    <b-tab title="Edit" class="mt-3">
      <DruxtEntityForm v-bind="route.props" />
    </b-tab>
  </b-tabs>

  <component :is="component" v-else v-bind="route.props" />
</template>

<script>
import Vue from 'vue'
import { TabsPlugin } from 'bootstrap-vue'
import DruxtEntityForm from 'druxt-entity/dist/components/DruxtEntityForm.vue'
import { DruxtRouterMixin } from 'druxt-router'

Vue.use(TabsPlugin)

export default {
  components: { DruxtEntityForm },

  mixins: [DruxtRouterMixin],

  computed: {
    editable() {
      return this.route.props.type !== 'contact_form--contact_form'
    },

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

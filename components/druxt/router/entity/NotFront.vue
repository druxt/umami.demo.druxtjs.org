<template>
  <!-- <b-tabs v-if="$auth.loggedIn"> -->
  <div v-if="isEditable">
    <b-tabs>
      <b-tab title="View" class="mt-3">
        <component :is="component" v-model="model" v-bind="route.props" />
      </b-tab>
      <!-- <b-tab v-if="$auth.loggedIn" title="Edit" class="mt-3"> -->
      <b-tab
        v-if="route.props.type !== 'contact_form--contact_form'"
        class="mt-3"
        lazy
        title="Edit"
      >
        <DruxtEntityForm v-model="model" v-bind="route.props" />
      </b-tab>
      <template #tabs-end>
        <b-button v-b-toggle.edit-bar class="ml-auto" variant="link">
          <BIconArrowBarLeft font-scale="0.9" />
          Edit bar
        </b-button>
      </template>
    </b-tabs>
    <b-sidebar
      id="edit-bar"
      lazy
      right
      shadow
      sidebar-class="border-left border-dark"
      title="Edit bar"
    >
      <DruxtEntityForm v-model="model" class="m-3" v-bind="route.props" />
    </b-sidebar>
  </div>

  <component :is="component" v-else v-bind="route.props" />
</template>

<script>
import Vue from 'vue'
import { BIconArrowBarLeft, TabsPlugin } from 'bootstrap-vue'
import { DruxtEntityForm } from 'druxt-entity'
import { DruxtRouterMixin } from 'druxt-router'

Vue.use(TabsPlugin)

export default {
  components: { BIconArrowBarLeft, DruxtEntityForm },

  mixins: [DruxtRouterMixin],

  data: () => ({
    model: null,
  }),

  computed: {
    component: ({ mode, route }) =>
      mode === 'form'
        ? 'DruxtEntityForm'
        : route.props.type !== 'contact_form--contact_form'
        ? 'DruxtEntity'
        : 'DruxtContact',

    isEditable: ({ route }) =>
      ![
        'contact_form--contact_form',
        'taxonomy_term--recipe_category',
        'taxonomy_term--tags',
      ].includes(route.props.type),
  },
}
</script>

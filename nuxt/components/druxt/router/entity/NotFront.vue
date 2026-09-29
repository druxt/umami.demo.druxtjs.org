<template>
  <div>
    <!-- The tab bar is the demo's teaching layer: the same entity rendered and
         edited. The rendered view is always in the page, so it is there
         before any JavaScript runs; the form is built when it is asked for.
         A contact form has no edit mode, so it gets no bar. -->
    <div v-if="editable" class="page-tabs" role="tablist">
      <button
        v-for="tab of tabs"
        :key="tab.id"
        :aria-selected="String(mode === tab.id)"
        class="page-tabs__tab"
        :class="{ 'is-active': mode === tab.id }"
        role="tab"
        type="button"
        @click="mode = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <component
      :is="component"
      v-show="mode === 'view'"
      v-bind="route.props"
      class="page-tabs__pane"
    />

    <DruxtEntityForm
      v-if="editable && mode === 'edit'"
      v-bind="route.props"
      class="page-tabs__pane"
    />
  </div>
</template>

<script>
import DruxtEntityForm from 'druxt-entity/dist/components/DruxtEntityForm.vue'
import { DruxtRouterMixin } from 'druxt-router'

export default {
  components: { DruxtEntityForm },

  mixins: [DruxtRouterMixin],

  data: () => ({
    mode: 'view',
    tabs: [
      { id: 'view', label: 'View' },
      { id: 'edit', label: 'Edit' },
    ],
  }),

  computed: {
    editable() {
      return this.route.props.type !== 'contact_form--contact_form'
    },

    component() {
      return this.route.props.type !== 'contact_form--contact_form'
        ? 'druxt-entity'
        : 'druxt-contact'
    },
  },

  watch: {
    /** A new route is a new page: back to the rendered view. */
    'route.props.uuid'() {
      this.mode = 'view'
    },
  },
}
</script>

<template>
  <div>
    <!-- The tab bar is the demo's teaching layer: the same entity rendered and
         edited. The rendered view is always in the page, so it is there
         before any JavaScript runs; the form is built when it is asked for.
         A contact form has no edit mode, so it gets no bar. -->
    <client-only>
      <AppDraftBanner
        v-if="editable"
        :type="route.props.type"
        :uuid="route.props.uuid"
      />
    </client-only>

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
        {{ $t(tab.label) }}
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
      { id: 'view', label: 'nav.view' },
      { id: 'edit', label: 'nav.edit' },
    ],
  }),

  computed: {
    /** Only content has a form worth editing here; a term has no display. */
    editable() {
      return String(this.route.props.type || '').startsWith('node--')
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
      this.mode = this.$route.hash === '#edit' ? 'edit' : 'view'
    },

    mode(mode) {
      const hash = mode === 'edit' ? '#edit' : ''
      if (this.$route.hash !== hash) {
        this.$router.replace({ path: this.$route.path, hash })
      }
    },
  },

  /** `#edit` on the URL opens the form, so an edit link can be shared. */
  mounted() {
    if (this.editable && this.$route.hash === '#edit') {
      this.mode = 'edit'
    }
  },
}
</script>

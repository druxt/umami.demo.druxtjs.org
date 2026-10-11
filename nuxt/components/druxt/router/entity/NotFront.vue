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

    <div v-if="editable" class="page-tabs">
      <div class="page-tabs__list" role="tablist">
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
      <!-- The frontend's Edit tab, and beside it Drupal's own screens for
           the same node, for an editor. -->
      <client-only>
        <AppDrupalLinks
          v-if="signedIn"
          :label="route.label || ''"
          :langcode="(route.entity || {}).langcode || route.props.langcode"
          :type="route.props.type"
          :uuid="route.props.uuid"
        />
      </client-only>
    </div>

    <!-- The diff host marks a draft's changes in the rendered view: each
         field wrapper reads its own diff through it. -->
    <DiffHost
      v-show="mode === 'view'"
      :document="draftDiff"
      :active="!!draftDiff"
      :resolve="resolveEntity"
      :minimap="false"
      :labels="{ removed: $t('draft.removed') }"
    >
      <component :is="component" v-bind="route.props" class="page-tabs__pane" />
    </DiffHost>

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
import { draftDocument } from '~/utils/draft-diff'
import { langMixin } from '~/utils/lang'

export default {
  components: { DruxtEntityForm },

  mixins: [DruxtRouterMixin, langMixin],

  data: () => ({
    mode: 'view',
    tabs: [
      { id: 'view', label: 'nav.view' },
      { id: 'edit', label: 'nav.edit' },
    ],
  }),

  computed: {
    /** Only content has a form worth editing here; a term has no display. */
    signedIn: ({ $auth }) => !!($auth && $auth.loggedIn),

    editable() {
      return String(this.route.props.type || '').startsWith('node--')
    },

    component() {
      return this.route.props.type !== 'contact_form--contact_form'
        ? 'druxt-entity'
        : 'druxt-contact'
    },

    /** The page's draft as a diff, while the editor wants it marked. */
    draftDiff() {
      if (!process.client || !this.$drafts || !this.editable) return null
      return draftDocument(this.$drafts, {
        type: this.route.props.type,
        id: this.route.props.uuid,
        langcode: this.lang,
      })
    },
  },

  methods: {
    /** The element rendering an entity on this page, for the diff host. */
    resolveEntity(uuid) {
      let found = null
      const visit = (vm) => {
        if (found) return
        if (
          vm.$options.name === 'DruxtEntity' &&
          vm.uuid === uuid &&
          vm.$el &&
          vm.$el.nodeType === 1
        ) {
          found = vm.$el
          return
        }
        vm.$children.forEach(visit)
      }
      visit(this)
      return found
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

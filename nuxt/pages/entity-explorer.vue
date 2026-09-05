<template>
  <div v-if="$fetchState.pending" class="text-center py-5"><b-spinner /></div>

  <div v-else>
    <div class="druxt-cta">
      <b-container>
        <span class="druxt-cta__kicker">Druxt playground</span>
        <h1 class="mt-2">Entity Explorer</h1>
        <p class="mt-3 mb-0" style="max-width: 62ch">
          Pick any node on this site and any Drupal display mode, and watch the
          same component render it. Edit the snippet and the preview updates
          live.
        </p>
      </b-container>
    </div>

    <b-container class="py-4 py-md-5">
      <!-- A grid, not a b-row: the DOM order below is the phone order
           (controls, preview, snippet, note) and .explorer in theme.scss
           places the preview into a full-height second column at md+. -->
      <div class="explorer">
        <div class="explorer__controls explorer__panel">
          <b-form-group
            class="mb-0"
            label="Entity type"
            label-class="stat-grid__label"
          >
            <b-form-select
              v-model="resourceType.selected"
              :options="resourceType.options"
              @change="$fetch"
            />
          </b-form-group>

          <b-form-group
            class="mb-0"
            label="Entity"
            label-class="stat-grid__label"
          >
            <b-form-select
              v-model="resource.selected"
              :options="resource.options"
            />
          </b-form-group>

          <b-form-group
            class="mb-0"
            label="Display mode"
            label-class="stat-grid__label"
          >
            <b-form-select
              v-model="display.selected"
              :options="display.options"
            />
          </b-form-group>
        </div>

        <div class="explorer__preview explorer__panel">
          <div class="explorer__head">
            <span class="stat-grid__label">Live preview</span>
            <a
              class="druxt-note__link"
              href="https://storybook.umami.demo.druxtjs.org"
              rel="noopener"
              target="_blank"
            >
              Open in Storybook →
            </a>
          </div>

          <div class="explorer__stage">
            <div class="explorer__mount">
              <client-only>
                <VueLivePreview :code="previewCode" />
              </client-only>
            </div>
          </div>

          <p class="explorer__request">GET {{ requestPath }}</p>
        </div>

        <div class="explorer__snippet explorer__panel">
          <span class="stat-grid__label">Editable</span>
          <div class="explorer__code">
            <client-only>
              <VueLiveEditor :code="previewCode" @change="edited = $event" />
            </client-only>
          </div>
        </div>

        <AppDruxtNote
          class="explorer__note"
          title="Every display mode is a component you can override"
          cta="Entity guide"
          href="https://druxtjs.org/modules/entity"
        >
          This one is
          <code>components/druxt/entity/Card.vue</code>. Drupal decides which
          fields the mode exposes; the component decides how they look.
        </AppDruxtNote>
      </div>
    </b-container>
  </div>
</template>

<script>
import { DrupalJsonApiParams } from 'drupal-jsonapi-params'
import { mapActions } from 'vuex'

import 'prismjs/themes/prism-tomorrow.css'
import 'vue-prism-editor/dist/prismeditor.min.css'

export default {
  name: 'EntityExplorer',

  // vue-live is not SSR-safe: it reads a browser global at module scope and
  // throws "Cannot read properties of undefined (reading 'get')" during
  // `nuxt generate`, which failed this route and left it a 404 in the static
  // build. Loaded lazily and rendered inside <client-only>.
  components: {
    VueLiveEditor: () => import('vue-live').then((m) => m.VueLiveEditor),
    VueLivePreview: () => import('vue-live').then((m) => m.VueLivePreview),
  },

  layout: 'plain',

  data: () => ({
    /** Edits made in the live editor. Null means "follow the selections". */
    edited: null,
    display: { selected: 'card', options: undefined },
    resource: { selected: undefined, options: undefined },
    resourceType: {
      selected: 'node--recipe',
      options: [
        { value: 'node--recipe', text: 'Recipes' },
        { value: 'node--article', text: 'Articles' },
        { value: 'node--page', text: 'Pages' },
      ],
    },
  }),

  async fetch() {
    this.resource.options = await this.getResources({
      resource: this.resourceType.selected,
      query: new DrupalJsonApiParams()
        .addFilter('status', '1')
        .addFields(this.resourceType.selected, ['id', 'title']),
    }).then((resources) =>
      resources.map((resource) => ({
        value: resource.id,
        text: resource.attributes.title,
      }))
    )
    // An entity type can have no published resources. Dereferencing [0] then
    // rejects fetch() and the page renders nothing rather than an empty state.
    this.resource.selected = (this.resource.options[0] || {}).value

    const [entityType, bundle] = this.resourceType.selected.split('--')
    this.display.options = await this.getResources({
      resource: 'entity_view_display--entity_view_display',
      query: new DrupalJsonApiParams()
        .addFilter('targetEntityType', entityType)
        .addFilter('bundle', bundle)
        .addFields('entity_view_display--entity_view_display', ['mode']),
    }).then((displays) => displays.map((display) => display.attributes.mode))
  },

  computed: {
    /** What the preview renders: the edited source if any, else the snippet
     * the current selections describe. */
    previewCode() {
      return this.edited === null ? this.code : this.edited
    },

    requestPath: ({ resource, resourceType }) =>
      `/en/jsonapi/${resourceType.selected.replace('--', '/')}/${
        resource.selected
      }`,

    code() {
      return `<Druxt
  module="entity"
  mode="${this.display.selected}"
  type="${this.resourceType.selected}"
  uuid="${this.resource.selected}"
/>`
    },
  },

  watch: {
    code() {
      this.edited = null
    },
  },

  methods: {
    ...mapActions({ getResources: 'druxtRouter/getResources' }),
  },
}
</script>

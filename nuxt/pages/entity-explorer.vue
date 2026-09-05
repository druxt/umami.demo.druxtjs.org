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

    <b-container class="py-5">
      <b-row>
        <b-col cols="12" lg="5">
          <b-form-group label="Entity type" label-class="stat-grid__label">
            <b-form-select
              v-model="resourceType.selected"
              :options="resourceType.options"
              @change="$fetch"
            />
          </b-form-group>

          <b-form-group label="Entity" label-class="stat-grid__label">
            <b-form-select
              v-model="resource.selected"
              :options="resource.options"
            />
          </b-form-group>

          <b-form-group label="Display mode" label-class="stat-grid__label">
            <b-form-select
              v-model="display.selected"
              :options="display.options"
            />
          </b-form-group>

          <div class="mt-4">
            <span class="stat-grid__label">Editable</span>
            <client-only>
              <VueLiveEditor
                class="mt-2"
                :code="previewCode"
                @change="edited = $event"
              />
            </client-only>
          </div>

          <AppDruxtNote
            class="mt-4"
            title="Every display mode is a component you can override"
            cta="Entity guide"
            href="https://druxtjs.org/modules/entity"
          >
            This one is
            <code>components/druxt/entity/Card.vue</code>. Drupal decides which
            fields the mode exposes; the component decides how they look.
          </AppDruxtNote>
        </b-col>

        <b-col cols="12" lg="7" class="mt-4 mt-lg-0 pl-lg-5">
          <div
            class="d-flex align-items-center justify-content-between pb-2 mb-3"
            style="border-bottom: 1px solid #e6ddcd"
          >
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

          <div
            class="d-flex justify-content-center p-5"
            style="background: #faf4ea; border: 1px solid #e6ddcd"
          >
            <div style="max-width: 320px; width: 100%">
              <client-only>
                <VueLivePreview :code="previewCode" />
              </client-only>
            </div>
          </div>

          <p
            class="mt-3 mb-0"
            style="
              font-family: 'IBM Plex Mono', monospace;
              font-size: 0.7188rem;
              color: #8a7f70;
            "
          >
            GET /en/jsonapi/{{ resourceType.selected.replace('--', '/') }}/{{
              resource.selected
            }}
          </p>
        </b-col>
      </b-row>
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
    // rejects fetch() and the page renders nothing at all rather than an
    // empty state.
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

  watch: {
    // A new selection means the generated snippet changed, so an earlier edit
    // no longer matches. Without this the controls look broken once edited.
    code() {
      this.edited = null
    },
  },

  computed: {
    /** What the preview renders: the edited source if there is any, else the
     * snippet the current selections describe. */
    previewCode() {
      return this.edited === null ? this.code : this.edited
    },

    code() {
      return `<Druxt
  module="entity"
  mode="${this.display.selected}"
  type="${this.resourceType.selected}"
  uuid="${this.resource.selected}"
/>`
    },
  },

  methods: {
    ...mapActions({ getResources: 'druxtRouter/getResources' }),
  },
}
</script>

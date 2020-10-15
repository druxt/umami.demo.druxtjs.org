<template>
  <div v-if="$fetchState.pending" class="text-center"><b-spinner /></div>

  <div v-else>
    <b-row class="mb-3">
      <b-col>
        <b-card>
          <b-card-title>DruxtJS Entity Explorer</b-card-title>

          <b-row>
            <b-col cols="12" md="6">
              <b-form-group label="Type" label-cols-sm="2">
                <b-form-select
                  v-model="resourceType.selected"
                  :options="resourceType.options"
                  @change="$fetch"
                />
              </b-form-group>

              <b-form-group label="Entity" label-cols-sm="2">
                <b-form-select
                  v-model="resource.selected"
                  :options="resource.options"
                />
              </b-form-group>

              <b-form-group label="Mode" label-cols-sm="2">
                <b-form-select
                  v-model="display.selected"
                  :options="display.options"
                />
              </b-form-group>
            </b-col>

            <b-col>
              <VueLiveEditor :code="code" />
            </b-col>
          </b-row>
        </b-card>
      </b-col>
    </b-row>

    <b-row>
      <b-col>
        <VueLivePreview :code="code" />
      </b-col>
    </b-row>
  </div>
</template>

<script>
import { DrupalJsonApiParams } from 'drupal-jsonapi-params'
import { VueLiveEditor, VueLivePreview } from 'vue-live'
import { mapActions } from 'vuex'

import 'prismjs/themes/prism-tomorrow.css'
import 'vue-prism-editor/dist/prismeditor.min.css'

export default {
  name: 'EntityExplorer',

  data: () => ({
    display: { selected: 'default', options: undefined },
    resource: { selected: undefined, options: undefined },
    resourceType: {
      selected: 'node--recipe',
      options: [
        { value: 'node--article', text: 'Articles' },
        { value: 'node--recipe', text: 'Recipes' },
        { value: 'node--page', text: 'Pages' },
      ],
    },
  }),

  components: { VueLiveEditor, VueLivePreview },

  async fetch() {
    // Load resources.
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
    this.resource.selected = this.resource.options[0].value

    // Load displays.
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

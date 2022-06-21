<template>
  <article>
    <b-row>
      <b-col>
        <b-row class="mb-3">
          <b-col>
            <slot name="field_tags" />
          </b-col>
        </b-row>

        <b-row class="mb-3">
          <b-col>
            <slot name="field_summary" />
          </b-col>
        </b-row>

        <b-row class="mb-3">
          <b-col>
            <slot name="field_media_image" />
          </b-col>
        </b-row>

        <b-row class="mb-3">
          <b-col>
            <slot name="body" />
          </b-col>
        </b-row>
      </b-col>

      <b-col md="4">
        <DruxtView
          :arguments="[entity.attributes.drupal_internal__nid]"
          display-id="block_1"
          view-id="articles_aside"
        >
          <template #default="{ display, results }">
            <h3 class="mt-4 mb-3" v-text="display.display_options.title" />
            <DruxtEntity
              v-for="result of results"
              :key="result.id"
              class="mb-3"
              mode="card"
              :type="result.type"
              :uuid="result.id"
            />
          </template>
        </DruxtView>
      </b-col>
    </b-row>
  </article>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  mixins: [DruxtEntityMixin],

  computed: {
    theme: () => 'umami',
  },

  druxt: {
    query: {
      fields: ['drupal_internal__nid'],
    },
  },
}
</script>

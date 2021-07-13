<template>
  <b-form-group
    :id="schema.id"
    :description="schema.description || ''"
    :invalid-feedback="stateFeedback"
    :label="label"
    label-class="font-weight-bold"
    :state="state"
  >
    <b-card no-body>
      <!-- If media is present. -->
      <b-tabs v-if="model" card>
        <b-tab title="Preview" class="p-1" lazy>
          <DruxtEntity v-model="media" v-bind="props" />
        </b-tab>
        <b-tab title="Edit" lazy class="p-3">
          <DruxtEntityForm v-bind="props" @input="onInput" />
        </b-tab>
        <template #tabs-end>
          <b-button class="ml-auto" variant="link" @click="model = null">
            Remove
          </b-button>
        </template>
      </b-tabs>

      <!-- Else, render Media Library Widget. -->
      <b-card-body v-else class="p-1">
        <b-button v-b-modal.media-library-widget block>Add media</b-button>

        <b-modal id="media-library-widget" title="Add media">
          <DruxtView display-id="widget" view-id="media_library">
            <template #default="{ results }">
              <b-card-group columns>
                <b-card
                  v-for="result of results"
                  :key="`MediaLibraryWidget:${result.id}`"
                  class="p-1"
                  no-body
                  @click="selectMedia(result)"
                >
                  <DruxtEntity :type="result.type" :uuid="result.id" />
                </b-card>
              </b-card-group>
            </template>
          </DruxtView>
        </b-modal>
      </b-card-body>
    </b-card>
  </b-form-group>
</template>

<script>
import DruxtFieldDefault from '~/components/druxt/field/Default'

export default {
  extends: DruxtFieldDefault,

  data: ({ value }) => ({
    media: null,
    model: value,
  }),

  computed: {
    props: ({ model }) => ({
      type: ((model || {}).data || {}).type,
      uuid: ((model || {}).data || {}).id,
    }),
  },

  methods: {
    selectMedia(data) {
      this.model = { data }
      this.media = null
    },
  },
}
</script>

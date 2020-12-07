<template>
  <div v-if="!$fetchState.pending">
    <b-form v-if="!result" @submit="onSubmit" @reset="onReset">
      <h2>{{ entity.attributes.label }}</h2>
      <b-form-group
        v-for="(schema, key) of fields"
        :key="key"
        :label="label(schema.id)"
        :label-for="schema.id"
        :state="state[schema.id] && !state[schema.id]"
      >
        <b-input
          v-if="schema.type === 'string_textfield'"
          :id="schema.id"
          v-model="model[schema.id]"
          :required="schema.required"
          :state="state[schema.id] && !state[schema.id]"
        />

        <b-textarea
          v-if="schema.type === 'string_textarea'"
          :id="schema.id"
          v-model="model[schema.id]"
          :required="schema.required"
          :rows="schema.settings.display.rows"
          :state="state[schema.id] && !state[schema.id]"
        />

        <b-form-invalid-feedback :state="state[schema.id] && !state[schema.id]">
          {{ state[schema.id] }}
        </b-form-invalid-feedback>
      </b-form-group>

      <b-button type="submit" variant="primary">Submit</b-button>
      <b-button type="reset" variant="danger">Reset</b-button>
    </b-form>

    <div v-else>{{ entity.attributes.message }}</div>
  </div>
</template>

<script>
import { Serializer } from 'jsonapi-serializer'
import { DruxtComponentMixin } from 'druxt'
import { DruxtRouterEntityMixin } from 'druxt-router'
import { DruxtSchemaMixin } from 'druxt-schema'

export default {
  name: 'DruxtContact',

  mixins: [DruxtComponentMixin, DruxtRouterEntityMixin, DruxtSchemaMixin],

  data: () => ({
    error: null,
    model: {},
    jsonapi: '',
    result: null,
  }),

  async fetch() {
    // Fetch Entity resource.
    await DruxtRouterEntityMixin.fetch.call(this)

    // Fetch Schema.
    this.schema = await this.getSchema({
      mode: this.mode,
      resourceType: `contact_message--${this.entity.attributes.drupal_internal__id}`,
      schemaType: 'form',
    })

    // Fetch Druxt theme component.
    await DruxtComponentMixin.fetch.call(this)
  },

  computed: {
    fields() {
      return this.schema.fields.filter((e) => {
        switch (true) {
          case e.id === 'name' || e.id === 'mail':
            e.type = 'string_textfield'
            break

          // @TODO - Add language support.
          case e.type === 'language_select':
            return false
        }

        return e.type
      })
    },

    state() {
      const state = {}
      if (!this.error) {
        return state
      }

      ;(this.error.data.errors || []).map((e) => {
        const attr = e.source.pointer.split('/')[3]
        state[attr] = e.detail.split(': ')[1]
        return e
      })
      return state
    },
  },

  methods: {
    label(id) {
      return id.charAt(0).toUpperCase() + id.slice(1)
    },

    async onSubmit(e) {
      e.preventDefault()

      // Reset states.
      this.error = null
      this.result = null

      // Setup JSON:API Serializer
      const serializer = new Serializer(this.schema.resourceType, {
        attributes: this.schema.fields.map((f) => f.id),
      })

      // Serialize model data.
      this.jsonapi = serializer.serialize(this.model)

      // Post data to backend.
      try {
        const result = await this.$druxtRouter().axios.post(
          this.schema.config.href,
          this.jsonapi,
          {
            headers: {
              'Content-Type': 'application/vnd.api+json',
            },
          }
        )
        this.result = result
      } catch (error) {
        this.error = error.response
      }
    },

    onReset(e) {
      e.preventDefault()
      this.model = {}
    },
  },

  druxt: ({ vm }) => ({
    componentOptions: [
      [vm.schema.resourceType, vm.schema.config.mode],
      [vm.schema.config.mode],
      ['default'],
    ],

    propsData: {
      entity: vm.entity,
      fields: vm.fields,
      schema: vm.schema,
    },
  }),
}
</script>

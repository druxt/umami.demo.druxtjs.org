<template>
  <component :is="wrapper.component" v-bind="wrapper.props">
    <!-- Image fields. -->
    <template v-if="isSchemaView && isTypeImage">
      <DruxtEntity
        v-for="{ type, id } of relationships"
        :key="id"
        v-bind="{ type, uuid: id }"
      >
        <template #default="{ entity }">
          <b-card-img-lazy
            :src="
              $config.baseUrl +
              entity.attributes.uri.value.replace(
                'public://',
                '/sites/default/files/'
              )
            "
          />
        </template>
      </DruxtEntity>
    </template>

    <!-- Reference fields. -->
    <template v-else-if="isSchemaView && relationship">
      <DruxtEntity
        v-for="{ type, id } of relationships"
        :key="id"
        v-bind="{ type, uuid: id }"
      />
    </template>

    <!-- Link field. -->
    <template v-else-if="isSchemaView && isTypeLink">
      <b-button
        v-for="(item, key) of items"
        :key="key"
        :to="item.uri.replace('internal:', '')"
      >
        {{ item.title }}
      </b-button>
    </template>

    <!-- Other View display fields. -->
    <!-- eslint-disable-next-line -->
    <p v-else-if="isSchemaView" v-html="html" />

    <!-- Entity reference forms. -->
    <b-card v-else-if="relationship" class="mb-3" no-body>
      <b-card-header header-tag="header" class="p-1" role="tab">
        <b-button v-b-toggle="`collapse-${schema.id}`" block variant="info">
          {{ label }}
        </b-button>
      </b-card-header>
      <b-collapse :id="`collapse-${schema.id}`">
        <b-card-body v-if="Array.isArray(relationships) && relationships[0].type">
          <DruxtEntityForm
            v-for="{ type, id } of relationships"
            :key="id"
            v-bind="{ type, uuid: id }"
          />
        </b-card-body>
      </b-collapse>
    </b-card>

    <!-- Form display fields. -->
    <b-form-group
      v-else
      :id="schema.id"
      :description="schema.description || ''"
      :invalid-feedback="stateFeedback"
      :label="label"
      :state="state"
    >
      <!-- Checkboxes -->
      <b-form-checkbox v-if="isTypeCheckbox" v-model="model" v-bind="props" />

      <!-- Input fields -->
      <b-input v-else-if="isTypeInput" v-model="model" v-bind="props" />

      <!-- Textarea -->
      <b-textarea
        v-else
        v-model="model"
        v-bind="{
          rows: schema.settings.display.rows || undefined,
          ...props,
        }"
      />
    </b-form-group>
  </component>
</template>

<script>
import { BFormCheckbox } from 'bootstrap-vue'
import { DruxtFieldMixin } from 'druxt-entity'
import DruxtEntity from 'druxt-entity/dist/components/DruxtEntity.vue'

export default {
  components: { BFormCheckbox, DruxtEntity },

  mixins: [DruxtFieldMixin],

  data: ({ relationship, schema, value }) => ({
    model:
      !relationship &&
      schema.config.schemaType === 'form' &&
      typeof value === 'object'
        ? JSON.stringify(value)
        : value,
  }),

  computed: {
    /**
     * One size fits all HTML to render for View displays, with JSON.stringify() as a fallback.
     * @returns {string}
     */
    html: ({ model }) =>
      typeof model === 'string'
        ? model
        : (model || {}).value
        ? model.value
        : JSON.stringify(model),

    isSchemaForm: ({ schema }) => schema.config.schemaType === 'form',
    isSchemaView: ({ schema }) => schema.config.schemaType === 'view',

    isTypeCheckbox: ({ schema }) => ['boolean_checkbox'].includes(schema.type),
    isTypeLink: ({ schema }) => ['link'].includes(schema.type),
    isTypeImage: ({ schema }) => ['responsive_image'].includes(schema.type),
    isTypeInput: ({ schema }) => ['string_textfield'].includes(schema.type),

    label: ({ schema }) =>
      ((string) => string.charAt(0).toUpperCase() + string.slice(1))(
        schema.label.text || schema.id
      ),

    props: ({ schema, state }) => ({
      placeholder: schema.settings.display.placeholder || undefined,
      required: schema.required || false,
      state,
    }),

    relationships: ({ model }) =>
      typeof (model || {}).data === 'object'
        ? [model.data]
        : (model || {}).data || false,

    state: ({ errors }) => ((errors || []).length ? false : null),
    stateFeedback: ({ errors }) =>
      (errors || []).map((error) => error.detail.split(': ')[1]).join('\n'),
  },

  watch: {
    model(value) {
      try {
        this.$emit('input', JSON.parse(value))
      } catch (e) {
        this.$emit('input', value)
      }
    },
  },
}
</script>

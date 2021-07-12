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
        <b-card-body>
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
      label-class="font-weight-bold"
      :state="state"
    >
      <!-- Checkboxes -->
      <b-form-checkbox v-if="isTypeCheckbox" v-model="model" v-bind="props" />

      <!-- Input fields -->
      <b-input
        v-else-if="isTypeInput && !isMultiple"
        v-model="model"
        v-bind="{ ...props, type: inputType }"
      />
      <Draggable v-else-if="isTypeInput && isMultiple" v-model="model">
        <b-input-group
          v-for="(field, key) of model"
          :key="key"
          class="mb-1"
          @mouseenter="hover = key"
          @mouseleave="hover = null"
        >
          <template #prepend>
            <b-input-group-text><BIconGripVertical /></b-input-group-text>
          </template>
          <b-input
            v-model="model[key]"
            v-bind="{ ...props, type: inputType }"
          />
          <template #append>
            <b-button
              v-show="hover === key"
              variant="danger"
              @click="model = model.filter((s, i) => i !== key)"
            >
              <BIconX />
            </b-button>
          </template>
        </b-input-group>

        <b-button @click="model.push('')">Add another</b-button>
      </Draggable>

      <!-- Select fields -->
      <b-form-select
        v-else-if="isTypeSelect"
        v-model="model"
        :options="selectOptions"
      />

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
import { DruxtEntity, DruxtFieldMixin } from 'druxt-entity'
import { BFormCheckbox, BIconGripVertical, BIconX } from 'bootstrap-vue'
import Draggable from 'vuedraggable'

export default {
  components: {
    BFormCheckbox,
    BIconGripVertical,
    BIconX,
    Draggable,
    DruxtEntity,
  },

  mixins: [DruxtFieldMixin],

  data: ({ relationship, schema, value }) => ({
    hover: null,
    model:
      !relationship &&
      schema.cardinality === 1 &&
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
        : (model || {}).processed || (model || {}).value
        ? (model || {}).processed || (model || {}).value
        : JSON.stringify(model),

    inputType: ({ isTypeInput, schema }) =>
      !isTypeInput
        ? false
        : {
            number: 'number',
          }[schema.type] || 'text',

    isMultiple: ({ schema }) => (schema.cardinality || 1) !== 1,

    isSchemaForm: ({ schema }) => schema.config.schemaType === 'form',
    isSchemaView: ({ schema }) => schema.config.schemaType === 'view',

    isTypeCheckbox: ({ schema }) => ['boolean_checkbox'].includes(schema.type),
    isTypeLink: ({ schema }) => ['link'].includes(schema.type),
    isTypeImage: ({ schema }) => ['responsive_image'].includes(schema.type),
    isTypeInput: ({ schema }) =>
      ['string_textfield', 'number'].includes(schema.type),
    isTypeSelect: ({ schema }) => ['options_select'].includes(schema.type),

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

    selectOptions: ({ isTypeSelect, schema, model }) => {
      if (!isTypeSelect) return null

      if (((schema.settings || {}).storage || {}).allowed_values) {
        return schema.settings.storage.allowed_values
      }

      return [model]
    },

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

<template>
  <b-form-group
    :id="schema.id"
    :label-for="`${schema.id}-field`"
    :invalid-feedback="stateFeedback"
    :label="fieldLabel"
    :state="state"
  >
    <b-input :id="`${schema.id}-field`" v-model="model" :state="state" />
  </b-form-group>
</template>

<script>
import DruxtFieldDefault from '~/components/druxt/field/Default.vue'

export default {
  extends: DruxtFieldDefault,

  data: ({ value }) => ({ model: value }),

  computed: {
    // The form display carries no label for this base field, so DruxtField
    // falls back to the machine name. Use the wording Drupal's own contact
    // form uses.
    fieldLabel: ({ schema }) => schema.label.text || 'Your name',
  },
}
</script>

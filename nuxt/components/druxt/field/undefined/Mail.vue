<template>
  <b-form-group
    :id="schema.id"
    :invalid-feedback="stateFeedback"
    :label="fieldLabel"
    :state="state"
  >
    <b-input v-model="model" type="email" :state="state" />
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
    fieldLabel: ({ schema }) => schema.label.text || 'Your email address',
  },
}
</script>

<template>
  <b-form-group
    :id="schema.id"
    :invalid-feedback="stateFeedback"
    label="Your name"
    :state="state"
  >
    <b-input v-model="model" :state="state" />
  </b-form-group>
</template>

<script>
import DruxtFieldDefault from '~/components/druxt/field/Default.vue'

/**
 * Druxt's form schema carries no label for a field (only view displays do),
 * so DruxtField falls back to the machine name. Drupal's own contact form
 * calls this one "Your name".
 */
export default {
  extends: DruxtFieldDefault,

  data: ({ value }) => ({ model: value }),
}
</script>

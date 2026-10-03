<template>
  <b-form-group
    :id="schema.id"
    :label-for="`${schema.id}-field`"
    :invalid-feedback="stateFeedback"
    label="Your email address"
    :state="state"
  >
    <b-input
      :id="`${schema.id}-field`"
      v-model="model"
      :state="state"
      type="email"
    />
  </b-form-group>
</template>

<script>
import DruxtFieldDefault from '~/components/druxt/field/Default.vue'

/**
 * Same as the name field: the form schema has no label, and Drupal's contact
 * form calls this one "Your email address".
 */
export default {
  extends: DruxtFieldDefault,

  data: ({ value }) => ({ model: value }),
}
</script>

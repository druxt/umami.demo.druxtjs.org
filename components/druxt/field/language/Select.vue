<template>
  <b-form-group
    :id="schema.id"
    :invalid-feedback="stateFeedback"
    :label="label"
    :state="state"
  >
    <b-select :options="[model]" v-model="model" />
  </b-form-group>
</template>

<script>
import DruxtFieldDefault from '~/components/druxt/field/Default.vue'

export default {
  extends: DruxtFieldDefault,
}
</script>

<template>
  <b-form-group
    :id="schema.id"
    :description="schema.description || ''"
    :invalid-feedback="stateFeedback"
    label="Authored by"
    label-class="font-weight-bold"
    :state="state"
  >
    <b-input v-model="model.data.id" />
  </b-form-group>
</template>

<script>
import DruxtFieldDefault from '~/components/druxt/field/Default'

export default {
  extends: DruxtFieldDefault,

  data: ({ value }) => ({
    model: value,
  }),
}
</script>

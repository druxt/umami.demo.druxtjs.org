<template>
  <b-form-group
    :id="schema.id"
    :invalid-feedback="stateFeedback"
    :label="label"
    :state="state"
  >
    <b-card>
      Summary:
      <b-textarea class="mb-3" v-model="model.summary" />

      Value:
      <b-textarea
        class="mb-3"
        v-model="model.value"
        :rows="schema.settings.display.rows"
      />

      Format:
      <b-select :options="[model.format]" v-model="model.format" />
    </b-card>
  </b-form-group>
</template>

<script>
import DruxtFieldDefault from '~/components/druxt/field/Default.vue'

export default {
  extends: DruxtFieldDefault,

  data: ({ value }) => ({ model: value }),
}
</script>

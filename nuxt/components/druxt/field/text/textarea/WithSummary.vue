<template>
  <b-form-group
    :id="schema.id"
    :invalid-feedback="stateFeedback"
    :label="label"
    :state="state"
  >
    <b-card>
      Summary:
      <b-textarea v-model="model.summary" class="mb-3" />

      Value:
      <b-textarea
        v-model="model.value"
        class="mb-3"
        :rows="schema.settings.display.rows"
      />

      Format:
      <b-select v-model="model.format" :options="[model.format]" />
    </b-card>
  </b-form-group>
</template>

<script>
import DruxtFieldDefault from '~/components/druxt/field/Default.vue'

export default {
  extends: DruxtFieldDefault,

  data: ({ value }) => ({
    model: value || { summary: '', value: '', format: '' },
  }),
}
</script>

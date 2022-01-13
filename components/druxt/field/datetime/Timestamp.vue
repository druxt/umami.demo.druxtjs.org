<template>
  <b-form-group
    :id="schema.id"
    :invalid-feedback="stateFeedback"
    :label="label"
    :state="state"
  >
    <b-input-group>
      <b-form-datepicker v-model="model.date" />
      <b-form-timepicker v-model="model.time" />
    </b-input-group>
  </b-form-group>
</template>

<script>
import { BFormDatepicker, BFormTimepicker } from 'bootstrap-vue'
import DruxtFieldDefault from '~/components/druxt/field/Default.vue'

export default {
  components: { BFormDatepicker, BFormTimepicker },

  extends: DruxtFieldDefault,

  data: ({ value }) => ({
    model: value
      ? { date: value.split('T')[0], time: value.split('T')[1].split('+')[0] }
      : { date: undefined, time: undefined },
  }),
}
</script>

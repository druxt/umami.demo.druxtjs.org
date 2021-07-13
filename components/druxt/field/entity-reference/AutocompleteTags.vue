<template>
  <b-form-group
    :id="schema.id"
    :description="schema.description || ''"
    :invalid-feedback="stateFeedback"
    :label="label"
    label-class="font-weight-bold"
    :state="state"
  >
    <b-form-tags v-model="tags" pill remove-on-delete separator=" ," />
  </b-form-group>
</template>

<script>
import { BFormTags } from 'bootstrap-vue'
import DruxtFieldDefault from '~/components/druxt/field/Default'

export default {
  components: { BFormTags },

  extends: DruxtFieldDefault,

  data: ({ value }) => ({
    debug: null,
    tags: value.data.map((o) => o.id),
    model: value,
  }),

  async fetch() {},
}
</script>

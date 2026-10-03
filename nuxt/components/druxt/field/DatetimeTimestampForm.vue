<template>
  <AppFormField
    :description="description"
    :feedback="feedback"
    :label="label"
    :required="required"
    :target="id"
  >
    <input
      :id="id"
      class="edit-control"
      type="datetime-local"
      :value="local"
      @change="$emit('input', fromLocalInput($event.target.value))"
    />
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'
import { fromLocalInput, single, toLocalInput } from '~/utils/form-widgets'

/** Drupal's ISO date with its offset, edited as local time. */
export default {
  mixins: [formField],

  computed: {
    local: ({ value }) => toLocalInput(single(value)),
  },

  methods: { fromLocalInput },
}
</script>

<template>
  <AppFormField
    :description="description"
    :feedback="feedback"
    :label="label"
    :required="required"
    :target="id"
  >
    <select
      :id="id"
      class="edit-control edit-control--select"
      :required="required"
      :value="current"
      @change="$emit('input', $event.target.value)"
    >
      <option v-if="!required" value="">None</option>
      <option v-for="o of options" :key="o.value" :value="o.value">
        {{ o.label }}
      </option>
    </select>
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'
import { allowedOptions, single } from '~/utils/form-widgets'

/** A list field's allowed values. */
export default {
  mixins: [formField],

  computed: {
    current: ({ value }) => single(value) || '',
    options: ({ schema }) => allowedOptions(schema),
  },
}
</script>

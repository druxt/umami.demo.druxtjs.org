<template>
  <AppFormField
    :description="description"
    :feedback="feedback"
    :label="label"
    :required="required"
    :target="id"
  >
    <textarea
      :id="id"
      class="edit-control edit-control--area"
      :rows="rows"
      :value="item.value || ''"
      @input="$emit('input', { ...item, value: $event.target.value })"
    />
    <span v-if="item.format" class="edit-field__format">{{ item.format }}</span>
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'
import { single } from '~/utils/form-widgets'

/** Formatted text as it is stored: the value and its format. */
export default {
  mixins: [formField],

  computed: {
    item: ({ value }) => {
      const v = single(value)
      return v && typeof v === 'object' ? v : { value: v || '' }
    },
    rows: ({ schema }) => (schema.settings.display || {}).rows || 4,
  },
}
</script>

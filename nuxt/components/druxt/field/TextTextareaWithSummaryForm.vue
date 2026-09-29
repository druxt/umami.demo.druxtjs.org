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
    <label
      class="edit-field__label edit-field__sublabel"
      :for="`${id}-summary`"
    >
      Summary
    </label>
    <textarea
      :id="`${id}-summary`"
      class="edit-control edit-control--area edit-control--summary"
      rows="2"
      :value="item.summary || ''"
      @input="$emit('input', { ...item, summary: $event.target.value })"
    />
    <span v-if="item.format" class="edit-field__format">{{ item.format }}</span>
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'
import { single } from '~/utils/form-widgets'

/** Formatted text with its summary: the body, then the standfirst under it. */
export default {
  mixins: [formField],

  computed: {
    item: ({ value }) => {
      const v = single(value)
      return v && typeof v === 'object' ? v : { value: v || '', summary: '' }
    },
    rows: ({ schema }) => (schema.settings.display || {}).rows || 9,
  },
}
</script>

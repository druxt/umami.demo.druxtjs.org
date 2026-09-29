<template>
  <AppFormField
    :description="description"
    :feedback="feedback"
    :label="label"
    :required="required"
    :target="id"
  >
    <!-- Drupal's own CKEditor 5 for the format, once the browser has it. The
         component is a textarea until then, and stays one if it never comes. -->
    <client-only>
      <DruxtCkeditor
        :id="id"
        class="edit-editor"
        :format="item.format || 'basic_html'"
        :upload="upload"
        :value="item.value || ''"
        @input="$emit('input', { ...item, value: $event })"
      />
      <textarea
        :id="id"
        slot="placeholder"
        class="edit-control edit-control--area"
        :rows="rows"
        :value="item.value || ''"
        @input="$emit('input', { ...item, value: $event.target.value })"
      />
    </client-only>
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
    /** An inserted picture's bytes go to the image media type's file field. */
    upload: () => ({
      resourceType: 'media--image',
      field: 'field_media_image',
    }),
  },
}
</script>

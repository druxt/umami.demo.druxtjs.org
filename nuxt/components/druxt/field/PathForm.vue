<template>
  <AppFormField
    :description="description"
    :feedback="feedback"
    label="URL alias"
    :target="id"
  >
    <div class="edit-control edit-control--unit">
      <span class="edit-control__unit">/{{ langcode }}</span>
      <input
        :id="id"
        placeholder="/recipes/my-recipe"
        type="text"
        :value="item.alias || ''"
        @input="$emit('input', { ...item, alias: $event.target.value })"
      />
    </div>
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'
import { single } from '~/utils/form-widgets'

/** The alias, the one part of a path a person types. */
export default {
  mixins: [formField],

  computed: {
    item: ({ value }) => single(value) || {},
    langcode: ({ item }) => item.langcode || 'en',
  },
}
</script>

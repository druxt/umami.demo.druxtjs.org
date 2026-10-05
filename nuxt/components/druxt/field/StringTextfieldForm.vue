<template>
  <AppFormField
    :description="description"
    :feedback="feedback"
    :label="label"
    :required="required"
    :target="id"
  >
    <!-- A multi-value string is a list: one row per item, Enter adds the next. -->
    <template v-if="multiple">
      <div class="edit-list">
        <div v-for="(item, index) of items" :key="index" class="edit-list__row">
          <span class="edit-list__grip" aria-hidden="true">⋮⋮</span>
          <input
            :ref="`row-${index}`"
            class="edit-list__input"
            type="text"
            :value="item"
            @input="setItem(index, $event.target.value)"
            @keydown.enter.prevent="addAfter(index)"
          />
          <button
            class="edit-list__remove"
            type="button"
            :aria-label="`Remove ${item || 'row'}`"
            @click="remove(index)"
          >
            ×
          </button>
        </div>
      </div>
      <button class="edit-list__add" type="button" @click="addAfter()">
        + Add {{ itemName }}
      </button>
    </template>

    <input
      v-else
      :id="id"
      class="edit-control"
      :class="{ 'edit-control--title': id === 'title' }"
      :maxlength="maxLength"
      :placeholder="placeholder"
      :required="required"
      type="text"
      :value="value || ''"
      @input="$emit('input', $event.target.value)"
    />
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'

export default {
  mixins: [formField],

  computed: {
    items: ({ value }) => (Array.isArray(value) ? value : value ? [value] : []),
    placeholder: ({ schema }) =>
      (schema.settings.display || {}).placeholder || '',
    maxLength: ({ schema }) =>
      (schema.settings.storage || {}).max_length || 255,
    /** "an ingredient", from the field's label. */
    itemName: ({ label }) => {
      const noun = label.toLowerCase().replace(/s$/, '')
      return `${/^[aeiou]/.test(noun) ? 'an' : 'a'} ${noun}`
    },
  },

  methods: {
    setItem(index, text) {
      const items = [...this.items]
      items[index] = text
      this.$emit('input', items)
    },
    addAfter(index = this.items.length - 1) {
      const items = [...this.items]
      items.splice(index + 1, 0, '')
      this.$emit('input', items)
      this.$nextTick(() => {
        const [input] = this.$refs[`row-${index + 1}`] || []
        if (input) input.focus()
      })
    },
    remove(index) {
      this.$emit(
        'input',
        this.items.filter((_, i) => i !== index)
      )
    },
  },
}
</script>

<template>
  <div class="edit-switch" :class="{ 'edit-field--invalid': feedback.length }">
    <label class="edit-field__label" :for="id">{{ label }}</label>
    <input
      :id="id"
      class="edit-switch__input"
      type="checkbox"
      :checked="!!single(value)"
      role="switch"
      @change="$emit('input', $event.target.checked)"
    />
    <p v-if="feedback.length" class="edit-field__error">
      {{ feedback.join(' ') }}
    </p>
  </div>
</template>

<script>
import formField from '~/utils/form-field'
import { single } from '~/utils/form-widgets'

/** A setting as a switch: label on the left, the switch on the right. */
export default {
  mixins: [formField],

  computed: {
    label() {
      const key = {
        status: 'form.published',
        promote: 'form.promoted',
        sticky: 'form.sticky',
        copy: 'form.copy',
      }[this.schema.id]
      return key
        ? this.$t(key)
        : ((this.schema || {}).label || {}).text || this.schema.id
    },
  },

  methods: { single },
}
</script>

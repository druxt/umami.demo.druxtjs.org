<template>
  <div class="edit-field" :class="{ 'edit-field--invalid': feedback.length }">
    <label v-if="label" class="edit-field__label" :for="target">
      {{ label }}<span v-if="required" class="edit-field__required">*</span>
    </label>

    <slot />

    <!-- The error takes the description's slot, so nothing reflows. -->
    <p v-if="feedback.length" class="edit-field__error">
      {{ feedback.join(' ') }}
    </p>
    <p v-else-if="description" class="edit-field__description">
      {{ description }}
    </p>
  </div>
</template>

<script>
/** Label above, control, description or error below. */
export default {
  props: {
    label: { type: String, default: '' },
    target: { type: String, default: null },
    description: { type: String, default: '' },
    feedback: { type: Array, default: () => [] },
    required: { type: Boolean, default: false },
  },
}
</script>

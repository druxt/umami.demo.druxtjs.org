<template>
  <b-form class="edit-form" novalidate @submit.prevent="$parent.onSubmit()">
    <AppEditFormErrors :errors="errors" :fields="fieldLabels" />
    <b-overlay :show="submitting" class="edit-form__content">
      <slot />
    </b-overlay>
  </b-form>
</template>

<script>
import { BOverlay } from 'bootstrap-vue'

/** Every node form: the fields in Drupal's order, the errors summed up. */
export default {
  components: { BOverlay },

  computed: {
    errors: ({ $parent }) => $parent.errors || [],
    submitting: ({ $parent }) => $parent.submitting,
    fieldLabels: ({ $parent }) =>
      Object.fromEntries(
        (($parent.schema || {}).fields || []).map((f) => [
          f.id,
          (f.label || {}).text || f.id,
        ])
      ),
  },
}
</script>

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
import editForm from '~/utils/edit-form'

/** Every node form: the fields in Drupal's order, the errors summed up. */
export default {
  components: { BOverlay },

  mixins: [editForm],
}
</script>

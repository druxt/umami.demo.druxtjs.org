<template>
  <AppFormField
    description="Transitions belong to Drupal's workflow; the form shows the state and never guesses a transition."
    :feedback="feedback"
    label="Moderation state"
  >
    <div class="edit-control edit-control--readonly">
      <span>{{ state }}</span>
      <span class="edit-control__unit">workflow</span>
    </div>
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'
import { single } from '~/utils/form-widgets'

export default {
  mixins: [formField],

  computed: {
    state: ({ value }) => {
      const v = String(single(value) || 'draft')
      return v.charAt(0).toUpperCase() + v.slice(1)
    },
  },
}
</script>

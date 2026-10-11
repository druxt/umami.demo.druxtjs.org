<template>
  <AppFormField
    :description="$t('form.moderationHint')"
    :feedback="feedback"
    :label="$t('form.moderationState')"
  >
    <div class="edit-control edit-control--readonly">
      <span>{{ state }}</span>
      <span class="edit-control__unit">{{ $t('form.workflow') }}</span>
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

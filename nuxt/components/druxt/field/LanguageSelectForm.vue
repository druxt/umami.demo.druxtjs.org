<template>
  <AppFormField :feedback="feedback" label="Language">
    <div class="edit-control edit-control--readonly">{{ name }}</div>
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'
import { single } from '~/utils/form-widgets'

/** The language is chosen by the URL, so here it is only shown. */
export default {
  mixins: [formField],

  computed: {
    name: ({ value }) =>
      ({ en: 'English', es: 'Español' }[single(value)] || single(value) || ''),
  },
}
</script>

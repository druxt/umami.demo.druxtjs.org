<template>
  <b-overlay :show="submitting">
    <b-form v-if="!(response || {}).data">
      <b-alert v-if="errors.length" show variant="warning">
        <h4 class="alert-heading">
          {{ errors[0].status }}: {{ errors[0].title }}
        </h4>
        {{ errors[0].detail }}
      </b-alert>

      <slot name="name" />
      <slot name="mail" />
      <slot name="subject" />
      <slot name="message" />
      <slot name="copy" />
      <slot name="buttons" />
    </b-form>

    <div v-else>
      <h2>Thank you for your feedback.</h2>
      <p>A team member will be in touch if required.</p>
    </div>
  </b-overlay>
</template>

<script>
import { BAlert, BOverlay } from 'bootstrap-vue'
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  components: { BAlert, BOverlay },

  mixins: [DruxtEntityMixin],

  computed: {
    errors: ({ $parent }) => ($parent.errors || []).filter((o) => !o.source),
    response: ({ $parent }) => $parent.response,
    submitting: ({ $parent }) => $parent.submitting || false,
  },
}
</script>

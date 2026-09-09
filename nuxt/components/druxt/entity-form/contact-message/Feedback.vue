<template>
  <div class="form-page">
    <span class="form-page__kicker">Contact</span>
    <h1 class="form-page__title">Tell us what you think</h1>
    <p class="form-page__blurb">
      Fields, labels, required flags and validation all come from Drupal's form
      config. Emails are not sent from the demo, but everything else runs.
    </p>

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

      <div v-else class="form-page__sent">
        <p><strong>Thank you for your feedback</strong></p>
        <p>This is the response Drupal sent back:</p>
        <VueJsonPretty :data="response.data" />
      </div>
    </b-overlay>

    <AppDruxtNote
      cta="Entity guide"
      href="https://druxtjs.org/modules/entity"
      kicker="How this works"
      title="One component per field, straight from the form display"
    >
      <code>DruxtEntityForm</code> reads the <code>contact_message</code> form
      display and renders a component per field type. None of this is
      hand-written markup: override a field component only when you want to.
    </AppDruxtNote>
  </div>
</template>

<script>
import { BAlert, BOverlay } from 'bootstrap-vue'
import { DruxtEntityMixin } from 'druxt-entity'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

export default {
  components: { BAlert, BOverlay, VueJsonPretty },

  mixins: [DruxtEntityMixin],

  computed: {
    errors: ({ $parent }) => ($parent.errors || []).filter((o) => !o.source),
    response: ({ $parent }) => $parent.response,
    submitting: ({ $parent }) => $parent.submitting,
  },
}
</script>

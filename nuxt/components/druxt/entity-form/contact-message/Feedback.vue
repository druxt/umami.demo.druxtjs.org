<template>
  <div class="form-page">
    <span class="form-page__kicker">{{ $t('contact.kicker') }}</span>
    <h1 class="form-page__title">{{ $t('contact.title') }}</h1>
    <p class="form-page__blurb">{{ $t('contact.blurb') }}</p>

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
        <p>
          <strong>{{ $t('contact.thanks') }}</strong>
        </p>
        <p>{{ $t('contact.response') }}</p>
        <VueJsonPretty :data="response.data" />
      </div>
    </b-overlay>

    <AppDruxtNote
      class="mt-4"
      file="entity-form/contact-message/Feedback.vue"
      :kicker="$t('note.howThisWorks')"
    >
      <i18n path="contact.noteBody" tag="span">
        <template #component><code>DruxtEntityForm</code></template>
        <template #form><code>contact_message</code></template>
      </i18n>
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

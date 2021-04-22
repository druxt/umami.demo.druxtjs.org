<template>
  <b-overlay :show="submitting">
    <b-card>
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
        <p><strong>Thank you for your feedback</strong></p>
        <p>
          This website is a demonstration of the DruxtJS decoupled framework,
          and emails are currently disabled.
        </p>
        <p>Find more information and support at:</p>
        <ul>
          <li><a href="https://druxtjs.org" target="_blank">DruxtJS.org</a></li>
          <li>
            <a href="https://discord.druxtjs.org" target="_blank">
              Druxt Discord server
            </a>
          </li>
          <li><a href="https://github.com/druxt" target="_blank">Github</a></li>
        </ul>
      </div>
    </b-card>
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

<template>
  <div>
    <h2 class="mb-3">{{ title }}</h2>

    <b-button v-b-modal.modal-contact variant="success">Contact</b-button>

    <b-modal
      id="modal-contact"
      cancel-title="Close"
      :ok-disabled="!validated || posted || posting"
      ok-title="Send"
      :title="!posted ? title : 'Thank you'"
      @cancel="resetForm"
      @close="resetForm"
      @ok="onSubmit"
    >
      <b-form v-if="!posted" :validated="validated" @submit="onSubmit">
        <b-form-group label="Name">
          <b-input
            v-model="input.name"
            :disabled="posting"
            required
            type="text"
          />
        </b-form-group>

        <b-form-group label="Company">
          <b-input
            v-model="input.company"
            :disabled="posting"
            required
            type="text"
          />
        </b-form-group>

        <b-form-group label="Email">
          <b-input
            v-model="input.email"
            :disabled="posting"
            required
            type="email"
          />
        </b-form-group>

        <b-form-group label="Message">
          <b-form-textarea
            v-model="input.message"
            :disabled="posting"
            required
            rows="5"
          />
        </b-form-group>
      </b-form>

      <b-row v-if="posted">
        <b-col>Your feedback has been sent.</b-col>
      </b-row>
    </b-modal>
  </div>
</template>

<script>
import axios from 'axios'
import { DruxtBlocksBlockMixin } from 'druxt-blocks'

export default {
  mixins: [DruxtBlocksBlockMixin],

  data: () => ({
    api: 'https://app.99inbound.com/api/e/Xtd7kGIU',
    input: {
      name: null,
      company: null,
      email: null,
      message: null,
    },
    posted: false,
    posting: false,
    title: 'Tell us what you think',
  }),

  computed: {
    validated() {
      return !!(this.input.name && this.input.email && this.input.message)
    },
  },

  methods: {
    async onSubmit(e) {
      e.preventDefault()

      this.posting = true
      await axios.post(this.api, this.input)
      this.posted = true
      this.posting = false
    },

    resetForm() {
      this.input = {
        name: null,
        email: null,
        message: null,
      }
      this.posted = false
      this.posting = false
    },
  },
}
</script>

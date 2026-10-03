<template>
  <!-- The way back to the fresh demo, for a signed-in editor. Asks first, in
       a dialog: the reset is for everyone on the site, not just this browser,
       and the question needs more room than the demo bar has. -->
  <span v-if="signedIn" class="reset-demo">
    <button
      class="reset-demo__button"
      type="button"
      :disabled="busy"
      @click="open = true"
    >
      {{ busy ? $t('reset.busy') : $t('reset.button') }}
    </button>
    <b-modal
      v-model="open"
      body-class="sign-in__body"
      centered
      dialog-class="sign-in__dialog reset-dialog"
      hide-footer
      lazy
      :no-close-on-backdrop="busy"
      :title="$t('reset.title')"
      title-class="sign-in__title"
      title-tag="h2"
    >
      <p class="reset-dialog__text">{{ message || $t('reset.confirm') }}</p>
      <div v-if="!message" class="reset-dialog__actions">
        <button
          class="btn btn-primary reset-dialog__yes"
          type="button"
          :disabled="busy"
          @click="reset"
        >
          {{ busy ? $t('reset.busy') : $t('reset.yes') }}
        </button>
        <button
          class="btn btn-outline-secondary reset-dialog__no"
          type="button"
          :disabled="busy"
          @click="open = false"
        >
          {{ $t('reset.no') }}
        </button>
      </div>
    </b-modal>
  </span>
</template>

<script>
import { DRAFTS_KEY } from '~/utils/edit-drafts'

export default {
  data: () => ({ open: false, busy: false, message: '' }),

  computed: {
    signedIn: ({ $auth }) => !!($auth && $auth.loggedIn),
  },

  methods: {
    async reset() {
      this.busy = true
      this.message = ''
      try {
        const token = this.$auth.strategy.token.get()
        const response = await fetch('/druxt-umami/reset', {
          method: 'POST',
          headers: { Accept: 'application/json', Authorization: token },
        })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(body.message || response.statusText)
        }
        // This browser's drafts belong to content that no longer exists as it was.
        try {
          window.localStorage.removeItem(DRAFTS_KEY)
        } catch (e) {
          // No storage, nothing kept.
        }
        this.$store.commit('drafts/discardAll')
        this.message = this.$t('reset.done')
        // Drupal is back within seconds; a fresh page reads the fresh demo,
        // and finds the session gone with it.
        window.setTimeout(() => window.location.reload(), 8000)
      } catch (error) {
        this.message = this.$t('reset.failed', { message: error.message })
      }
      this.busy = false
    },
  },
}
</script>

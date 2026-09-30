<template>
  <!-- The way back to the fresh demo, for a signed-in editor. Asks first:
       the reset is for everyone on the site, not just this browser. -->
  <span v-if="signedIn" class="reset-demo">
    <button
      v-if="!asking && !busy"
      class="reset-demo__button"
      type="button"
      @click="asking = true"
    >
      {{ $t('reset.button') }}
    </button>
    <span v-else-if="asking" class="reset-demo__ask" role="alertdialog">
      <span class="reset-demo__question">{{ $t('reset.confirm') }}</span>
      <button class="reset-demo__yes" type="button" @click="reset">
        {{ $t('reset.yes') }}
      </button>
      <button class="reset-demo__no" type="button" @click="asking = false">
        {{ $t('reset.no') }}
      </button>
    </span>
    <span v-else class="reset-demo__busy">{{ $t('reset.busy') }}</span>
    <span v-if="message" class="reset-demo__message" role="status">{{
      message
    }}</span>
  </span>
</template>

<script>
import { DRAFTS_KEY } from '~/utils/edit-drafts'

export default {
  data: () => ({ asking: false, busy: false, message: '' }),

  computed: {
    signedIn: ({ $auth }) => !!($auth && $auth.loggedIn),
  },

  methods: {
    async reset() {
      this.asking = false
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
        this.$store.dispatch('druxtIce/discardAll')
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

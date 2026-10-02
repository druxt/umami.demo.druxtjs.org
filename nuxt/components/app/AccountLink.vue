<template>
  <!-- Sign in, or the signed-in name and a way out. -->
  <button v-if="loggedIn" type="button" @click="signOut">
    {{ $t('nav.signOut')
    }}<span v-if="name" class="account-link__name"> · {{ name }}</span>
  </button>
  <!-- The page is the fallback: a plain click opens the dialog in place. -->
  <a v-else :href="to" @click="openDialog">{{ $t('nav.signIn') }}</a>
</template>

<script>
export default {
  props: {
    to: { type: String, default: '/login' },
  },

  // The generated page is a visitor's. Rendered signed in from the start, the
  // link no longer matched that markup, and the mismatch put every component
  // after it out of step with its hydration data: the banner took another's
  // and lost its photograph. It changes once mounted, as the page's does.
  data: () => ({ mounted: false }),

  computed: {
    loggedIn: ({ $auth, mounted }) => mounted && !!($auth && $auth.loggedIn),
    name: ({ $auth }) => (($auth || {}).user || {}).name || '',
  },

  mounted() {
    this.mounted = true
  },

  methods: {
    openDialog(event) {
      // A modified or middle click still opens the page, as a link does.
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey) {
        return
      }
      event.preventDefault()
      this.$store.commit('ui/setSignIn', true)
    },

    async signOut() {
      await this.$auth.logout()
      // The store keeps what the session read; a fresh load forgets it.
      window.location.assign('/')
    },
  },
}
</script>

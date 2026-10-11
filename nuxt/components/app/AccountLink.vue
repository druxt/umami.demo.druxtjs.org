<template>
  <!-- Sign in, or the signed-in name and a way out. -->
  <button v-if="loggedIn" type="button" @click="signOut">
    {{ $t('nav.signOut')
    }}<span v-if="name" class="account-link__name"> · {{ name }}</span>
  </button>
  <nuxt-link v-else :to="to">{{ $t('nav.signIn') }}</nuxt-link>
</template>

<script>
export default {
  props: {
    to: { type: String, default: '/login' },
  },

  computed: {
    loggedIn: ({ $auth }) => !!($auth && $auth.loggedIn),
    name: ({ $auth }) => (($auth || {}).user || {}).name || '',
  },

  methods: {
    async signOut() {
      await this.$auth.logout()
      // The store keeps what the session read; a fresh load forgets it.
      window.location.assign('/')
    },
  },
}
</script>

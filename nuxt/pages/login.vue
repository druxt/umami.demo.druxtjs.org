<template>
  <div class="band band--paper">
    <b-container>
      <div class="auth">
        <span class="auth__kicker">Editors</span>
        <h1 class="auth__title">Sign in to edit this magazine</h1>
        <p class="auth__blurb">
          Drupal owns the accounts. Druxt sends you there and back with a token.
        </p>

        <b-form-group label="Site">
          <b-input :value="site" plaintext readonly />
        </b-form-group>

        <b-button variant="primary" @click="login">
          Continue with Drupal →
        </b-button>

        <AppDruxtNote
          kicker="How this works"
          link="https://druxtjs.org/modules/auth"
          link-title="Authentication guide"
        >
          <code>druxt-auth</code> runs OAuth2 Authorization Code with PKCE. You
          land on Drupal's own login, come back to <code>/callback</code>, and
          the token lets every Druxt component write as well as read.
        </AppDruxtNote>
      </div>
    </b-container>
  </div>
</template>

<script>
export default {
  head: () => ({ title: 'Sign in' }),

  computed: {
    site() {
      return (this.$config.baseUrl || '').replace(/^https?:\/\//, '')
    },
  },

  methods: {
    login() {
      this.$auth.loginWith('drupal')
    },
  },
}
</script>

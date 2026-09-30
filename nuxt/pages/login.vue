<template>
  <div class="auth">
    <span class="auth__kicker">Editors</span>
    <h1 class="auth__title">Sign in</h1>
    <p class="auth__blurb">
      Your account is in Drupal. Sign in here and every Druxt component on this
      site can write as well as read.
    </p>

    <form class="auth__form" novalidate @submit.prevent="submit">
      <div v-if="error" class="edit-form__alert" role="alert">{{ error }}</div>

      <div class="edit-field">
        <label class="edit-field__label" for="login-name"
          >Username or email</label
        >
        <input
          id="login-name"
          v-model="username"
          autocapitalize="off"
          autocomplete="username"
          class="edit-control"
          required
          type="text"
        />
      </div>

      <div class="edit-field">
        <label class="edit-field__label" for="login-pass">Password</label>
        <input
          id="login-pass"
          v-model="password"
          autocomplete="current-password"
          class="edit-control"
          required
          type="password"
        />
      </div>

      <b-button
        block
        class="auth__submit"
        :disabled="busy || !username || !password"
        type="submit"
        variant="primary"
      >
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </b-button>
    </form>

    <AppDruxtNote file="pages/login.vue" kicker="How this works">
      <code>druxt-auth</code> exchanges these for a token with Drupal's password
      grant, on this origin, with no redirect. The token lets every Druxt
      component write as well as read, and renews on its own.
    </AppDruxtNote>
  </div>
</template>

<script>
export default {
  data: () => ({
    username: '',
    password: '',
    busy: false,
    error: '',
  }),
  head: () => ({ title: 'Sign in' }),

  computed: {
    /** Where to go afterwards: where the visitor came from, else home. */
    redirect: ({ $route }) => String($route.query.redirect || '/en'),
  },

  mounted() {
    if (this.$auth && this.$auth.loggedIn) {
      this.$router.replace(this.redirect)
    }
  },

  methods: {
    async submit() {
      this.busy = true
      this.error = ''
      try {
        await this.$auth.loginWith('drupal-password', {
          data: { username: this.username.trim(), password: this.password },
        })
        this.$router.push(this.redirect)
      } catch (e) {
        const detail = (((e || {}).response || {}).data || {}).message
        this.error =
          detail || 'That username and password do not match an account here.'
      }
      this.busy = false
    },
  },
}
</script>

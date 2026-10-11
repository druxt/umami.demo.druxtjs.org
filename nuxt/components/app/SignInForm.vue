<template>
  <!-- One form for the sign-in dialog and the /login page behind it. -->
  <form class="auth__form" novalidate @submit.prevent="submit">
    <div v-if="error" class="edit-form__alert" role="alert">{{ error }}</div>

    <div class="edit-field">
      <label class="edit-field__label" :for="`${idPrefix}-name`">{{
        $t('login.username')
      }}</label>
      <input
        :id="`${idPrefix}-name`"
        ref="name"
        v-model="username"
        autocapitalize="off"
        autocomplete="username"
        class="edit-control"
        required
        type="text"
      />
    </div>

    <div class="edit-field">
      <label class="edit-field__label" :for="`${idPrefix}-pass`">{{
        $t('login.password')
      }}</label>
      <input
        :id="`${idPrefix}-pass`"
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
      {{ busy ? $t('login.busy') : $t('login.submit') }}
    </b-button>
  </form>
</template>

<script>
export default {
  props: {
    /** The fields' ids: the dialog's form can open over the /login page's. */
    idPrefix: { type: String, default: 'login' },

    /** Where to go once signed in; unset, the reader stays on this page. */
    destination: { type: String, default: null },
  },

  data: () => ({
    username: '',
    password: '',
    busy: false,
    error: '',
  }),

  mounted() {
    this.focus()
  },

  methods: {
    focus() {
      this.$nextTick(() => this.$refs.name && this.$refs.name.focus())
    },

    async submit() {
      this.busy = true
      this.error = ''
      try {
        await this.$auth.loginWith('drupal-password', {
          data: { username: this.username.trim(), password: this.password },
        })
        this.$store.commit('ui/setSignIn', false)
        if (this.destination) {
          this.$router.push(this.destination)
        } else if (this.$nuxt && this.$nuxt.refresh) {
          // The page was read as a visitor: read it again as this account.
          this.$nuxt.refresh()
        }
      } catch (e) {
        const detail = (((e || {}).response || {}).data || {}).message
        this.error = detail || this.$t('login.failed')
      }
      this.busy = false
    },
  },
}
</script>

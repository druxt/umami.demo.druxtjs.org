<template>
  <div class="auth">
    <span class="auth__kicker">{{ $t('login.kicker') }}</span>
    <h1 class="auth__title">{{ $t('login.title') }}</h1>
    <p class="auth__blurb">{{ $t('login.blurb') }}</p>

    <form class="auth__form" novalidate @submit.prevent="submit">
      <div v-if="error" class="edit-form__alert" role="alert">{{ error }}</div>

      <div class="edit-field">
        <label class="edit-field__label" for="login-name">{{
          $t('login.username')
        }}</label>
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
        <label class="edit-field__label" for="login-pass">{{
          $t('login.password')
        }}</label>
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
        {{ busy ? $t('login.busy') : $t('login.submit') }}
      </b-button>
    </form>

    <AppDruxtNote file="pages/login.vue" :kicker="$t('note.howThisWorks')">
      <i18n path="login.noteBody" tag="span">
        <template #module><code>druxt-auth</code></template>
      </i18n>
    </AppDruxtNote>
  </div>
</template>

<script>
import { seoHead } from '~/utils/seo'
import { langMixin } from '~/utils/lang'
export default {
  mixins: [langMixin],

  data: () => ({
    username: '',
    password: '',
    busy: false,
    error: '',
  }),
  head() {
    return seoHead({
      origin: this.$config.siteOrigin,
      path: this.$route.path,
      title: this.$t('login.title'),
      robots: 'noindex, nofollow',
    })
  },

  computed: {
    /** Where to go afterwards: where the visitor came from, else home. */
    redirect: ({ $route, prefix }) => String($route.query.redirect || prefix),
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

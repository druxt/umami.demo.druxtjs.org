<template>
  <!-- Sign in where the reader is: a dialog, a sheet on a phone. /login
       shows the same form to a reader without JavaScript or a direct link. -->
  <b-modal
    v-model="open"
    body-class="sign-in__body"
    centered
    dialog-class="sign-in__dialog"
    hide-footer
    lazy
    :title="$t('login.title')"
    title-class="sign-in__title"
    title-tag="h2"
    @shown="$refs.form && $refs.form.focus()"
  >
    <p class="auth__blurb">{{ $t('login.blurb') }}</p>
    <AppSignInForm ref="form" id-prefix="sign-in" />
  </b-modal>
</template>

<script>
export default {
  computed: {
    open: {
      get: ({ $store }) => $store.state.ui.signIn,
      set(value) {
        this.$store.commit('ui/setSignIn', value)
      },
    },
  },
}
</script>

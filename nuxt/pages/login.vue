<template>
  <div class="auth">
    <span class="auth__kicker">{{ $t('login.kicker') }}</span>
    <h1 class="auth__title">{{ $t('login.title') }}</h1>
    <p class="auth__blurb">{{ $t('login.blurb') }}</p>

    <AppSignInForm :destination="redirect" />

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

  head() {
    return seoHead({
      origin: this.$config.siteOrigin,
      path: this.$route.path,
      title: this.$t('login.title'),
      robots: 'noindex, nofollow',
    })
  },

  computed: {
    /**
     * Where to go afterwards: where the visitor came from, else home. Only a
     * path on this site: `//host` or `/\\host` would leave it.
     */
    redirect: ({ $route, prefix }) => {
      const to = String($route.query.redirect || '')
      return /^\/(?![/\\])/.test(to) ? to : prefix
    },
  },

  mounted() {
    if (this.$auth && this.$auth.loggedIn) {
      this.$router.replace(this.redirect)
    }
  },
}
</script>

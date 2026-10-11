/**
 * druxt-auth's authorization code scheme, pointed at the backend this module
 * connected to.
 *
 * nuxt/auth reads a strategy's endpoints when it uses them, not when the site
 * is built, so the three moments that matter are covered here: `mounted()`,
 * which exchanges the code on the way back from the backend, `login()`, which
 * sends the browser there, and `refreshTokens()`, which renews the session.
 * The backend comes from `$druxtIce` once it has connected, and from the
 * record it keeps in storage until then, which is the case on the callback
 * page: the plugin that connects is still checking the backend while nuxt/auth
 * exchanges the code, and the record is what says where the code came from.
 */
import DrupalScheme from 'druxt-auth/templates/drupal-scheme.js'
import {
  backendFor,
  pointStrategyAt,
} from '@druxt-contrib/inline-content-edit'

export default class DruxtIceScheme extends DrupalScheme {
  /** Follow the connection, when there is one to follow. */
  follow() {
    if (typeof window === 'undefined') return false
    return pointStrategyAt(
      this.options,
      backendFor(this.$auth.ctx, window.localStorage)
    )
  }

  async mounted() {
    this.follow()
    return super.mounted()
  }

  async login(options) {
    this.follow()
    return super.login(options)
  }

  async refreshTokens() {
    this.follow()
    return super.refreshTokens()
  }
}

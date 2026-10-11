import { RefreshScheme } from '~auth/runtime'
import { SESSION_ENDPOINTS, withDrupalSession } from './drupal-session'

/**
 * The password grant, with an optional Drupal session.
 *
 * The grant issues a token and nothing else: the credentials go to Drupal's
 * token endpoint through this module's server route, and no Drupal session
 * is opened. A frontend that talks to the API alone needs nothing more. One
 * that proxies Drupal's own pages does, because those pages read the session
 * cookie and nothing else, and without one every proxied screen is anonymous
 * however signed in the frontend looks.
 *
 * `session: true` opens the session too, through the proxied JSON login with
 * the same credentials, before the grant. Off by default: it needs
 * `/user/login` reaching Drupal on the site's origin, and it costs a request
 * a token-only site has no use for. Signing out ends both.
 */

const DEFAULTS = {
  name: 'drupal-password',
  session: false,
  endpoints: { ...SESSION_ENDPOINTS },
}

/** Earlier layers win, as the runtime's own merge has it. */
const merge = (...layers) =>
  layers.reduce(
    (all, layer) => ({
      ...(layer || {}),
      ...all,
      endpoints: {
        ...((layer || {}).endpoints || {}),
        ...(all.endpoints || {}),
      },
    }),
    {}
  )

export default class DrupalPasswordScheme extends withDrupalSession(
  RefreshScheme
) {
  constructor ($auth, options, ...defaults) {
    // RefreshScheme takes no defaults from its callers, unlike Oauth2Scheme,
    // and drops any it is handed. Handed these the way DrupalScheme hands
    // its own, they never arrived, and the session step posted to the root.
    // So they are merged in here first, the strategy's config winning.
    super($auth, merge(options, ...defaults, DEFAULTS))
  }

  /**
   * Signs in with the password grant, opening a Drupal session first when
   * the strategy asks for one.
   *
   * The session comes first, so wrong credentials and a session that belongs
   * to someone else are both refused before Drupal is asked for a token.
   * `openSession` ends a stale session this scheme left behind, awaited, so a
   * new sign-in never races that teardown. A grant refused after the session
   * opened ends it again. Either way a refused sign-in leaves nothing behind.
   *
   * @param {object} endpoint - The request, with `data.username` and
   *   `data.password`, as `loginWith` passes it.
   */
  async login (endpoint = {}, options) {
    if (!this.options.session) return super.login(endpoint, options)

    const { username, password } = (endpoint || {}).data || {}
    // The grant names the fields `username` and `password`; Drupal's JSON
    // login names them `name` and `pass`. The caller sends the grant's.
    await this.openSession({ name: username, pass: password })
    // The token this sign-in just opened. A concurrent sign-in can replace it
    // before the grant returns, and the cleanup below must end this session,
    // not that one.
    const opened = this.$auth.$storage.getUniversal(this.logoutTokenKey)
    try {
      return await super.login(endpoint, { ...(options || {}), reset: false })
    } catch (error) {
      // Left open, the session outlives a sign-in the frontend reports as
      // failed, and the next person at this browser reaches Drupal's pages
      // signed in as this one. Skipped when another sign-in has taken over
      // the token, whose session is not this one's to end.
      if (this.$auth.$storage.getUniversal(this.logoutTokenKey) === opened) {
        await this.drupalLogout()
      }
      throw error
    }
  }

  /**
   * Ends the Drupal session too, when one was opened, then signs out the
   * way the refresh scheme does. Without a logout token there is nothing
   * to end and nothing is requested, so a token-only site pays nothing.
   */
  async logout (...args) {
    await this.drupalLogout()
    return super.logout(...args)
  }
}

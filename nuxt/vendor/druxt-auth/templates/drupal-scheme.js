import { Oauth2Scheme } from '~auth/runtime'
import { SESSION_ENDPOINTS, withDrupalSession } from './drupal-session'

/**
 * The authorization code grant, with a sign-in form of the site's own.
 *
 * Plain `oauth2` sends the browser to Drupal's authorize page, which sends an
 * anonymous visitor on to Drupal's login form. This scheme signs in first,
 * through Drupal's JSON login, so the authorize step finds a session and a
 * consumer set to approve automatically returns straight away: the visitor
 * never sees a Drupal page.
 *
 * The session cookie has to reach the authorize request, so both must be on
 * one origin. `druxt: { proxy: { api: true } }` arranges it: the module
 * proxies `/user/login`, `/user/logout`, `/user/password`, `/oauth/authorize`,
 * `/oauth/token` and `/session/token`, and points the `authorization` endpoint
 * at the site.
 * The login path is proxied for POST alone, so a login page at that path
 * still renders. Without credentials, `login()` is `oauth2`'s own.
 */

const DEFAULTS = {
  name: 'drupal',
  endpoints: { ...SESSION_ENDPOINTS },
}

export default class DrupalScheme extends withDrupalSession(Oauth2Scheme) {
  constructor ($auth, options, ...defaults) {
    super($auth, options, ...defaults, DEFAULTS)
  }

  /**
   * Signs in to Drupal with credentials when given them, then starts the
   * authorization code flow.
   *
   * @param {object} [options] - oauth2's login options, plus `credentials`.
   * @param {object} [options.credentials] - `{ name, pass }`.
   */
  async login ({ credentials, ...options } = {}) {
    const endpoints = this.options.endpoints

    if (credentials) {
      await this.openSession(credentials)
    }

    // Where the browser goes to authorize depends on where the session was
    // just created. Credentials set the cookie on this origin through the
    // proxy, so the authorize request has to come from here too. Without
    // them Drupal shows its own login form, which is on Drupal's origin.
    endpoints.authorization =
      credentials && endpoints.authorizationSameOrigin
        ? endpoints.authorizationSameOrigin
        : endpoints.authorizationBackend || endpoints.authorization

    return super.login(options)
  }

  async logout () {
    // Signing out locally happens either way. A Drupal session this could
    // not reach is not a reason to strand the visitor signed in here.
    await this.drupalLogout()
    return super.logout()
  }
}

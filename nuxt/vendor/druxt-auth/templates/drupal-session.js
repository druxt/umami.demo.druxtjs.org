/**
 * A Drupal session, for the strategies that open one.
 *
 * Both sign-ins that take credentials want a Drupal session cookie on the
 * site's own origin: the authorization code flow so the authorize step finds
 * it, and the password grant when a site proxies Drupal's own pages, which
 * read that cookie and nothing else. One implementation, so the hardening
 * lives in one place: the refusal of a session that belongs to someone else,
 * the recovery of one this module abandoned, the CSRF header a foreign
 * session route needs, and the check that the answer came from Drupal at
 * all. A second copy would start without any of it.
 *
 * Applied as a mixin, so `this` is the scheme and a subclass that overrides
 * one step is still the one `openSession()` calls.
 */

export const SESSION_ENDPOINTS = {
  drupalLogin: '/user/login?_format=json',
  drupalLogout: '/user/logout?_format=json',
  passwordReset: '/user/password?_format=json',
  // Unset: Drupal core has no route that ends a session it did not issue a
  // logout token for. A site that adds one points this at it.
  sessionLogout: null,
  // The verb that route answers on. POST because more routes accept it.
  sessionLogoutMethod: 'post',
  // Core's own, on every Drupal. A route protected the way core protects
  // its writes needs this header, and without it answers 403 with nothing
  // naming CSRF, which invites a site to remove the protection instead.
  // A route that needs no header can set this to null.
  csrfToken: '/session/token',
}

export const withDrupalSession = (Base) =>
  class extends Base {
    /** The storage key for the token Drupal's JSON logout wants. */
    get logoutTokenKey () {
      return this.name + '.logout_token'
    }

    /**
     * The endpoint named, or a failure that names it. Unset, the request
     * would go to the site's root and fail as the site being unreachable,
     * which points away from the configuration that is actually missing.
     */
    endpointOf (name) {
      const url = this.options.endpoints[name]
      if (!url) {
        throw new Error(
          `The ${name} endpoint is not set on the ${this.name} strategy.`
        )
      }
      return url
    }

    /**
     * Ends the Drupal session when auth-next resets this strategy.
     *
     * A reset runs when the refresh token expires, when the app switches
     * strategies, and at the start of a sign-in. None of those call
     * `logout()`, and a Drupal session left behind signs the next person at
     * this browser into Drupal's pages as this one. Best effort: reset is
     * synchronous, so the request is sent and not awaited. Browser only: the
     * session cookie is the browser's, and an SSR reset cannot end it.
     */
    reset (...args) {
      // Browser only. A Drupal session cookie is the browser's, and ending it
      // is meaningless from the server. Worse, an SSR reset can send the
      // logout with no cookie, Drupal answers 403 for the anonymous request, and
      // drupalLogout reads that 403 as the session already gone and drops the
      // token while the browser session lives on.
      if (process.client) this.drupalLogout().catch(() => {})
      return super.reset(...args)
    }

    /**
     * Opens a Drupal session with credentials, refusing one that is not ours.
     *
     * Drupal refuses a second sign-in while a session is open, and that
     * session may not be ours. One this scheme opened is a sign-in the
     * visitor abandoned, so end it and sign in properly. Any other belongs to
     * whoever left it there, and carrying on would sign the visitor in as
     * them: on a shared browser, one person as another.
     *
     * @param {object} credentials - `{ name, pass }`.
     * @throws With `sessionInUse` set when the open session is not ours.
     */
    async openSession (credentials) {
      if (!(await this.drupalLogin(credentials))) return

      const refuse = () => {
        const error = new Error(
          'A Drupal session is already open in this browser. Sign out of it before signing in with credentials.'
        )
        // Flagged rather than matched on: a sign-in form has to tell this
        // apart from a network failure, and the message is not a contract.
        error.sessionInUse = true
        throw error
      }
      if (!(await this.drupalLogout())) {
        // A site whose backend can end a session it did not open points
        // `endpoints.sessionLogout` at that route. Drupal core cannot: its
        // JSON logout wants the token issued at login, which this never
        // had. Unset, the session stands and the credentials are refused.
        if (!(await this.endForeignSession())) refuse()
      }
      if (await this.drupalLogin(credentials)) refuse()
    }

    /**
     * Starts a Drupal session through its JSON login.
     *
     * Drupal answers 403 when a session already exists, and that session
     * belongs to whoever left it there rather than to whoever just submitted
     * these credentials. Reusing it would sign the second person in as the
     * first, so this reports the reuse and lets the caller refuse it.
     *
     * @param {object} credentials - `{ name, pass }`.
     * @returns {boolean} Whether an existing session answered instead.
     * @throws When the answer is not Drupal's, so no session was created.
     */
    async drupalLogin ({ name, pass }) {
      let data
      try {
        ;({ data } = await this.$auth.request({
          method: 'post',
          baseURL: '',
          url: this.endpointOf('drupalLogin'),
          data: { name, pass },
          withCredentials: true,
        }))
      } catch (error) {
        const { status, data: body } = error.response || {}
        if (status === 403 && /anonymous users/i.test((body || {}).message || '')) {
          return true
        }
        throw error
      }

      // Drupal's JSON login answers with the account and a logout token.
      // Anything else did not come from Drupal, and a 200 from the site's own
      // routes would otherwise read as a sign-in these credentials never made.
      // Checked outside the catch so the refusal cannot be swallowed as one.
      if (!data || !data.current_user || !data.logout_token) {
        throw new Error(
          'The Drupal login endpoint did not answer with a session. Check that this request reaches Drupal rather than the site itself.'
        )
      }

      this.$auth.$storage.setUniversal(this.logoutTokenKey, data.logout_token)
      return false
    }

    /**
     * Ends the Drupal session this scheme opened.
     *
     * Drupal issues the logout token at login, so holding one is what makes a
     * session ours to end. The token is only discarded once the session is
     * known to be gone: a request that failed for any other reason may have
     * left it alive, and the token is the only way back to it.
     *
     * @returns {boolean} Whether the session is now ended.
     */
    async drupalLogout () {
      const token = this.$auth.$storage.getUniversal(this.logoutTokenKey)
      if (!token) return false

      // Resolved before the try: an unset endpoint is a configuration error
      // and should say so, not read as a session that could not be ended.
      const url = this.endpointOf('drupalLogout')
      try {
        await this.$auth.request({
          method: 'post',
          baseURL: '',
          url,
          params: { token },
          withCredentials: true,
        })
      } catch (error) {
        // 403 is Drupal saying the session has already ended, which is the
        // outcome wanted. Anything else leaves it possibly alive.
        if (((error || {}).response || {}).status !== 403) return false
      }

      // Remove only the token that was sent. reset() ends a session without
      // awaiting, so a concurrent sign-in may have stored a newer one, and
      // clearing that would strand the new session with no token to end it.
      if (this.$auth.$storage.getUniversal(this.logoutTokenKey) === token) {
        this.$auth.$storage.removeUniversal(this.logoutTokenKey)
      }
      return true
    }

    /**
     * Ends a Drupal session this scheme did not open.
     *
     * Only a site that provides a route for it can do this, so the endpoint
     * is unset by default and the module ships nothing to serve it.
     *
     * @returns {boolean} Whether the session is now ended.
     */
    async endForeignSession () {
      const { sessionLogout, sessionLogoutMethod, csrfToken } =
        this.options.endpoints
      if (!sessionLogout) return false

      try {
        const headers = {}

        if (csrfToken) {
          const { data } = await this.$auth.request({
            method: 'get',
            baseURL: '',
            url: csrfToken,
            withCredentials: true,
          })
          headers['X-CSRF-Token'] = String(data).trim()
        }

        await this.$auth.request({
          method: sessionLogoutMethod || 'post',
          baseURL: '',
          url: sessionLogout,
          headers,
          withCredentials: true,
        })
        return true
      } catch (error) {
        return false
      }
    }

    /**
     * Asks Drupal to email a password reset link. Drupal answers the same
     * whether or not the address has an account.
     *
     * A Drupal username may contain `@`, so the guess is wrong for those
     * accounts; name the field to look up when the caller knows it.
     *
     * @param {string} value - The address, or the account name.
     * @param {string} [identifier] - The field to look up, `mail` or `name`.
     */
    async resetPassword (value, identifier = /@/.test(value) ? 'mail' : 'name') {
      await this.$auth.request({
        method: 'post',
        baseURL: '',
        url: this.endpointOf('passwordReset'),
        data: { [identifier]: value },
        withCredentials: true,
      })
    }
  }

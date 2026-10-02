/**
 * Recovers a session whose access tokens Drupal revoked.
 *
 * Saving a user revokes that user's access tokens.
 * `simple_oauth_user_update()` calls `TokenExpiryTriggerHandler::handleUserUpdate()`
 * unconditionally, so an editor who edits their own profile comes back to a
 * site that believes it is signed in and is refused every request. Simple
 * Simple OAuth revokes on the save with no opt-out, so the frontend has to
 * recover rather than rely on a backend setting.
 *
 * Only access tokens go. The refresh token survives, so the credential to
 * recover with is already in the browser. The library refreshes a token it
 * believes has expired, and a token deleted on the server never looks
 * expired, so the answer has to be the trigger rather than the clock.
 */

/** Marks a replayed request, so one failure cannot start a loop. */
export const RETRIED = '__druxtAuthRetried'

/**
 * How long a token is taken to be fresh, in milliseconds.
 *
 * Sharing the in-flight promise is necessary and not sufficient. A burst does
 * not fail all at once: the first request is refused and refreshes, and the
 * rest are refused a few hundred milliseconds later, by which time there is
 * no refresh in flight to share. Each refresh rotates the tokens and revokes
 * what the previous one issued, so those later requests would refresh again
 * and invalidate the token the first one just took. The window that matters
 * is since a refresh last succeeded, not while one is running.
 */
export const GRACE = 5000

/**
 * Refreshes allowed inside WINDOW before the site gives up on recovering.
 *
 * A burst costs one refresh, so reaching this means refreshes keep
 * succeeding while requests keep failing, which recovery is not going to fix.
 */
export const LIMIT = 3
export const WINDOW = 30000

/**
 * Whether an answer is worth refreshing for.
 *
 * @param {Error} error - The rejected request.
 * @param {object} session - `{ loggedIn, hasRefreshToken, tokenUrl }`.
 * @returns {boolean}
 */
/**
 * Whether a failed request was bound for the backend the token belongs to.
 *
 * The interceptor sits on axios instances a site may also use for other
 * hosts. Recovering a request to another origin would replay it with the
 * Drupal access token on its `Authorization` header, disclosing the token to
 * that host. A relative URL resolves against the instance's own backend base,
 * so it is safe; an absolute URL is only safe when its origin matches that
 * base.
 *
 * @param {object} config - The failed request's axios config.
 * @param {object} instance - The axios instance that made it.
 * @returns {boolean}
 */
export const targetsBackend = (config, instance) => {
  const url = (config || {}).url || ''
  const isAbsolute = (u) => /^[a-z][a-z0-9+.-]*:\/\//i.test(u)
  const sameOrigin = (a, b) => {
    try {
      return new URL(a).origin === new URL(b).origin
    } catch (error) {
      return false
    }
  }
  // The origin the token is safe on: the instance's configured backend, never
  // a per-request baseURL, which the caller could point elsewhere.
  const backend = ((instance || {}).defaults || {}).baseURL || ''

  // A protocol-relative `//host/...` names another origin while looking
  // path-like, so it is treated as absolute, not relative.
  if (/^\/\//.test(url)) return false

  if (isAbsolute(url)) {
    return isAbsolute(backend) && sameOrigin(url, backend)
  }

  // A relative URL goes to the request's baseURL when it sets one, else the
  // instance's. Either must be the backend for the token to travel with it.
  const base = (config || {}).baseURL
  if (base) {
    return isAbsolute(base) ? sameOrigin(base, backend) : base === backend
  }
  return true
}

export const shouldRefresh = (error, session = {}) => {
  const { response, config } = error || {}

  // A 403 is Drupal saying no, and asking again only hears it again.
  if (!response || response.status !== 401) return false

  // No config is a failure that cannot be replayed, and a replay that fails
  // again is a real sign-out.
  if (!config || config[RETRIED]) return false

  // The refresh itself runs on this instance, so it reaches this handler.
  // Refreshing for it would await the promise it is already inside, and the
  // site would hang rather than sign out.
  if (session.tokenUrl && config.url === session.tokenUrl) return false

  // `loggedIn` is the wrong signal on the server: auth-next sets it only
  // after `fetchUser` succeeds, and `fetchUser` is the request that 401s, so
  // on a page load it is false for the very request whose recovery would set
  // it. The refresh token is the credential that matters. On the client the
  // flag still gates, so a stale refresh cookie does not refresh on every 401.
  return Boolean((session.loggedIn || session.server) && session.hasRefreshToken)
}

export default function (context) {
  // Read `$auth` from the context when it is needed, never from the
  // arguments. The authentication module injects it after this plugin runs,
  // so a plugin that took it as an argument would hold nothing and silently
  // never retry.
  const auth = () => context.$auth || (context.app || {}).$auth

  // One refresh for however many requests fail at once. Each refresh rotates
  // the refresh token, so three requests refreshing separately would leave
  // two of them holding a token that no longer works.
  let refreshing = null
  let refreshedAt = 0
  const refresh = () => {
    // Just refreshed, so the token in hand is the one a refresh would fetch.
    // Retry with it rather than rotating the tokens out from under whoever
    // took the last one.
    if (!refreshing && refreshedAt && Date.now() - refreshedAt < GRACE) {
      return Promise.resolve()
    }
    if (!refreshing) {
      if (!allowed()) return Promise.reject(new Error('refresh limit'))
      refreshing = auth()
        .refreshTokens()
        .then((result) => {
          refreshedAt = Date.now()
          return result
        })
        .finally(() => {
          refreshing = null
        })
    }
    return refreshing
  }

  // A backend revoking continuously would otherwise buy a refresh per
  // request forever.
  let recent = []
  const allowed = () => {
    const now = Date.now()
    recent = recent.filter((at) => now - at < WINDOW)
    if (recent.length >= LIMIT) return false
    recent.push(now)
    return true
  }

  const session = () => {
    const $auth = auth()
    const strategy = ($auth || {}).strategy
    const refreshToken = (strategy || {}).refreshToken
    const endpoints = ((strategy || {}).options || {}).endpoints || {}
    const token = endpoints.refresh || endpoints.token
    return {
      loggedIn: Boolean($auth && $auth.loggedIn),
      server: typeof process !== 'undefined' && Boolean(process.server),
      hasRefreshToken: Boolean(refreshToken && refreshToken.get()),
      tokenUrl: typeof token === 'string' ? token : (token || {}).url,
    }
  }

  const attach = (instance) => {
    if (!instance || !instance.interceptors) return
    instance.interceptors.response.use(undefined, async (error) => {
      if (!shouldRefresh(error, session())) throw error
      // Never replay another host's request with the Drupal token attached.
      if (!targetsBackend(error.config, instance)) throw error

      try {
        await refresh()
      } catch (failed) {
        // The refresh token is gone too. That is the real sign-out, and the
        // original answer is what the caller should see.
        throw error
      }

      const config = { ...error.config, [RETRIED]: true }
      const strategy = auth().strategy
      // `token.get()` returns the value with its type prefix already on it.
      const token = ((strategy || {}).token || {}).get
        ? strategy.token.get()
        : undefined
      if (token) config.headers = { ...config.headers, Authorization: token }
      return instance.request(config)
    })
  }

  const setup = () => {
    const { $axios, $druxt } = context
    const druxtAxios = ($druxt || {}).axios
    attach(druxtAxios)
    if ($axios && $axios !== druxtAxios) attach($axios)
  }

  // Attach once every plugin has injected. A site that registers druxt after
  // this plugin would otherwise reach here with `context.$druxt` still
  // undefined, and `attach(undefined)` is a silent no-op, so druxt's axios
  // would never be intercepted. `onNuxtReady` is the client signal that all
  // plugins have mounted, and requests come after it. Without it, in a test
  // or SSR, attach at once.
  if (typeof window !== 'undefined' && window.onNuxtReady) {
    window.onNuxtReady(setup)
  } else {
    setup()
  }
}

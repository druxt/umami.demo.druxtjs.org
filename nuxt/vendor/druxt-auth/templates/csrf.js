/**
 * Drupal's CSRF token on writes, while a sign-in holds a Drupal session.
 *
 * A strategy that opens a session (the authorization code flow, or the
 * password grant with `passwordSession`) leaves a Drupal session cookie in
 * the browser. With that cookie on the request, Drupal counts a write as
 * cookie authenticated, whatever bearer token rides beside it, and refuses
 * it with a 403 unless it carries an X-CSRF-Token header. A token-only
 * sign-in opens no session, sends no cookie, and gets no header.
 *
 * The token comes from Drupal's /session/token on this origin, once per page,
 * and again when Drupal answers that the one sent is no longer valid. Applied
 * to the Druxt client's axios and to the app's own.
 */
const WRITES = ['post', 'patch', 'put', 'delete']
const CSRF_PATH = '<%= options.csrfToken %>'

export default (context) => {
  const { $axios, $druxt } = context
  // The session step stores Drupal's logout token: its presence is the
  // session's. Read from the context on each request: auth-next's plugin runs
  // after this one, so `$auth` is not there yet when this one does.
  const sessionOpen = () => {
    const $auth = context.$auth
    const name = (($auth || {}).strategy || {}).name
    return !!(name && $auth.$storage.getUniversal(`${name}.logout_token`))
  }

  let token = null
  const fetchToken = async () => {
    const response = await fetch(CSRF_PATH, { credentials: 'same-origin' })
    token = response.ok ? await response.text() : null
    return token
  }

  const clients = [($druxt || {}).axios, $axios].filter(
    (client, index, all) =>
      client && client.interceptors && all.indexOf(client) === index
  )
  for (const client of clients) {
    client.interceptors.request.use(async (config) => {
      const method = String(config.method || 'get').toLowerCase()
      if (!WRITES.includes(method) || !sessionOpen()) return config
      config.headers = config.headers || {}
      config.headers['X-CSRF-Token'] = token || (await fetchToken())
      return config
    })
    client.interceptors.response.use(undefined, async (error) => {
      const { config, response } = error || {}
      const refused =
        response &&
        response.status === 403 &&
        /X-CSRF-Token/i.test(JSON.stringify(response.data || ''))
      if (!refused || !config || config.__druxtCsrfRetried || !sessionOpen())
        throw error
      config.__druxtCsrfRetried = true
      config.headers['X-CSRF-Token'] = await fetchToken()
      return client.request(config)
    })
  }
}

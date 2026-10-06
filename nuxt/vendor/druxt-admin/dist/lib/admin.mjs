/**
 * Which paths are Drupal's, and where they are on the backend.
 *
 * No browser and no Vue in here, so the decisions can be tested directly.
 * They are decisions rather than plumbing: "is this an admin path" and "where
 * does it live on the backend" are the two questions the whole module turns
 * on, and both are easy to get subtly wrong.
 *
 * Drupal's own admin paths are used rather than a prefix of this module's own.
 * A decoupled site that invents `/druxt-admin/...` has two addresses for one
 * page, and the link this module renders would have to translate between them
 * on every hop. Following Drupal means the address in the browser is the
 * address on the backend, which is also what makes the proxy tier possible
 * later without changing anything here.
 */

/**
 * The paths a stock Drupal treats as administrative.
 *
 * Prefixes, not an exhaustive list: `/admin` covers everything under it, which
 * is most of them. The rest are the paths outside `/admin` that are still the
 * site's back of house.
 *
 * Deliberately not read from Drupal. It would be one more request before the
 * first paint, to answer a question whose answer has not changed in a decade,
 * and a site that has moved its paths can say so in configuration.
 */
export const ADMIN_PATHS = [
  '/admin',
  '/node/add',
  '/media/add',
  '/user/login',
  '/user/logout',
  '/user/password',
  '/user/register',
]

/** Trim a trailing slash so two spellings of one path compare equal. */
function normalise(path) {
  const trimmed = String(path || '')
    .split('?')[0]
    .split('#')[0]
  return trimmed.length > 1 ? trimmed.replace(/\/+$/, '') : trimmed
}

/**
 * Whether a path belongs to Drupal's admin.
 *
 * A prefix matches the path itself and anything below it, but not a path that
 * merely starts with the same characters: `/administrators` is content, and
 * matching it would take a page away from the site that owns it.
 */
export function isAdminPath(path, paths = ADMIN_PATHS) {
  const subject = normalise(path)
  if (!subject) return false
  return paths.some((prefix) => {
    const p = normalise(prefix)
    return subject === p || subject.startsWith(`${p}/`)
  })
}

/**
 * The same path on the backend.
 *
 * Returns nothing without a backend, which is the honest answer for a static
 * build that has not connected one: there is no address to send anybody to,
 * and a link to nowhere is worse than no link.
 */
export function backendPath(baseUrl, path) {
  const base = String(baseUrl || '').replace(/\/+$/, '')
  if (!base) return ''
  const subject = String(path || '/')
  return `${base}${subject.startsWith('/') ? subject : `/${subject}`}`
}

/** The modes an admin slot can be in, in the order they were built. */
export const MODES = ['link', 'proxy']

/**
 * The mode to use, given what the site asked for.
 *
 * An unknown mode falls back to `link` rather than throwing. Getting this
 * wrong should cost a site the seamless version of its admin, not its whole
 * build, and `link` works everywhere with no configuration.
 */
export function resolveMode(mode) {
  return MODES.includes(mode) ? mode : 'link'
}

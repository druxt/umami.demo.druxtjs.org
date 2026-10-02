/**
 * Which requests are Drupal's to answer in proxy mode.
 *
 * Kept free of Node's own modules, like the rest of src/lib/, so anything can
 * import it: a component, or a page cache in front of Nuxt that has to skip
 * exactly these paths so it never stores a login form with its token in it.
 */
import { ADMIN_PATHS, isAdminPath } from './admin.mjs'

/**
 * Drupal's own paths, beyond the administration screens themselves.
 *
 * An admin screen is not one request. It is the screen, the CSS and JavaScript
 * behind it, the AJAX endpoints its forms call, and the files it shows. Miss
 * one of those and the page arrives unstyled, or a form silently stops
 * submitting, which is worse than not proxying at all.
 *
 * The list stops short of `/node` and `/media`, which a decoupled site renders
 * itself. Their editing paths come back in through `EDIT_PATH`.
 */
export const BACKEND_PATHS = [
  // Assets: core's own, contributed, themes, and the public files directory.
  '/core',
  '/libraries',
  '/modules',
  '/profiles',
  '/themes',
  // The endpoints an administration screen talks to while it is open.
  '/batch',
  '/system',
  '/session',
  '/file',
  '/views/ajax',
  '/contextual',
  '/editor',
  '/toolbar',
  '/entity_reference_autocomplete',
  '/update.php',
  // The whole of /user, because a login form that posts to the backend on
  // another origin sets its cookie there, which is the problem the proxy
  // exists to solve.
  '/user',
]

/**
 * The public files directory.
 *
 * `/sites` as a whole is deliberately not in `BACKEND_PATHS`. A proxy makes
 * everything it covers reachable from this origin, and a backend that was only
 * reachable from the Node process is the case where that matters: `/sites`
 * carries each site's settings alongside its files, and only the files are
 * anybody's business here.
 */
export const FILES_PATH = /^\/sites\/[^/]+\/files(\/|$)/

/**
 * The editing paths that hang off a canonical entity route.
 *
 * `/node/12` belongs to the decoupled site. `/node/12/edit` belongs to Drupal,
 * and so does every other operation on it.
 */
export const EDIT_PATH =
  /^\/(node|media|taxonomy\/term|comment|user)\/[^/]+\/(edit|delete|revisions|translations|devel|layout)(\/|$)/

/** Whether a request is Drupal's to answer. */
export function shouldProxy(path, options = {}) {
  const subject = String(path || '').split('?')[0]
  if (!subject) return false
  if (isAdminPath(subject, options.paths || ADMIN_PATHS)) return true
  if (EDIT_PATH.test(subject)) return true
  if (FILES_PATH.test(subject)) return true
  const prefixes = options.backendPaths || BACKEND_PATHS
  return prefixes.some(
    (prefix) => subject === prefix || subject.startsWith(`${prefix}/`)
  )
}

/**
 * Drupal's front page, under either language prefix: `/`, `/en`, `/es`, and
 * the `/node` path the site's front page setting names. Drupal's router
 * answers `isHomePath` only for the default language's spelling, so a
 * Spanish `/es/node` would otherwise render as an inner page.
 */
const FRONT = /^\/(en|es)?(\/node)?\/?$/

export const isFront = (route, path) =>
  !!(route || {}).isHomePath || FRONT.test(String(path || ''))

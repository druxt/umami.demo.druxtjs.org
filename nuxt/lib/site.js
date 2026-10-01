/**
 * The site's identity, shared by the page heads and the build-time files.
 *
 * CommonJS, so the generate hook can require it; the runtime imports it too.
 */

/** The languages the site serves, as Drupal prefixes them. */
const LANGCODES = ['en', 'es']

/** Open Graph locales per language. */
const LOCALES = { en: 'en_US', es: 'es_ES' }

const SITE_NAME = 'Umami'

// The Spanish lines are Spanish, not misspellings.
/* cspell:disable */
const SITE_TITLE = {
  en: 'Umami — a decoupled food magazine, built with DruxtJS',
  es: 'Umami: una revista de cocina desacoplada, hecha con DruxtJS',
}

const SITE_DESCRIPTION = {
  en: 'A demonstration food magazine: Drupal Umami content rendered by Nuxt with DruxtJS.',
  es: 'Una revista de cocina de demostración: el contenido de Drupal Umami servido por Nuxt con DruxtJS.',
}

/* cspell:enable */

const TWITTER_HANDLE = '@DruxtJS'

/** The share card for pages without a photograph of their own. */
const SITE_CARD = '/og/site.png'

/**
 * The origin visitors reach the site on. The start script hands the build
 * its own origin as LOOPBACK_ORIGIN; on Lagoon that is the environment's
 * route. Production is the fallback.
 */
const siteOrigin = (env = process.env) =>
  String(
    env.SITE_ORIGIN ||
      env.LOOPBACK_ORIGIN ||
      env.LAGOON_ROUTE ||
      'https://umami.demo.druxtjs.org'
  ).replace(/\/$/, '')

/**
 * Drupal's public origin, for the links that hand through to its admin.
 * Named outright, read from the environment's routes on Lagoon, or the
 * backend the build talks to when that is not the site itself.
 */
const drupalOrigin = (env = process.env) => {
  const own = siteOrigin(env)
  const named = env.DRUPAL_PUBLIC_URL
  const route = String(env.LAGOON_ROUTES || '')
    .split(',')
    .map((r) => r.trim())
    .find((r) => /^https?:\/\/(nginx|api)\./.test(r))
  const backend = env.BASE_URL && env.BASE_URL !== own ? env.BASE_URL : ''
  // The start script's backend, when a browser can reach it: a bare
  // container name (nginx on Lagoon) is internal, a loopback address is not.
  const proxied =
    /^https?:\/\/(localhost|127\.0\.0\.1|[^/:]+\.[^/:]+)(:|\/|$)/.test(
      env.DRUPAL_URL || ''
    )
      ? env.DRUPAL_URL
      : ''
  return String(named || route || backend || proxied || '').replace(/\/+$/, '')
}

/** The language a path is in, from its prefix; English when there is none. */
const langcodeOf = (path) =>
  (String(path || '').match(/^\/(en|es)(\/|$)/) || [])[1] || 'en'

/**
 * One URL per page: no trailing slash, and a language's home is its prefix.
 * Drupal names the front page `/node`, which is not where visitors are.
 */
const canonicalPath = (path) => {
  const trimmed = String(path || '/').replace(/\/+$/, '') || '/'
  if (trimmed === '/') return '/en'
  return trimmed.replace(/^\/(en|es)\/node$/, '/$1')
}

const canonicalUrl = (origin, path) => origin + canonicalPath(path)

/** An absolute URL for a path the frontend serves, such as a Drupal file. */
const absolute = (origin, url) =>
  /^https?:\/\//.test(url) ? url : origin + url

module.exports = {
  LANGCODES,
  LOCALES,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_CARD,
  TWITTER_HANDLE,
  siteOrigin,
  drupalOrigin,
  langcodeOf,
  canonicalPath,
  canonicalUrl,
  absolute,
}

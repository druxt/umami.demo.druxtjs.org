/**
 * Builder for `/sitemap.xml`, from the routes a generate run wrote.
 *
 * Pure and side-effect free, so it can be tested without a build.
 */

/** Routes the site serves but search should not list. */
const PRIVATE = [
  /^\/node\/preview(\/|$)/,
  /^\/login$/,
  /^\/callback$/,
  // Drupal's own account paths, reached through the sign-in link.
  /^\/(en\/|es\/)?user(\/|$)/,
]

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/** A language's home ranks first, content next, listings after. */
const priorityOf = (path) => {
  if (/^\/(en|es)$/.test(path)) return 1.0
  if (/^\/(en|es)\/(recipes|articles)\/./.test(path)) return 0.8
  if (/^\/(en|es)\/[^/]+$/.test(path)) return 0.6
  return 0.5
}

/** The paths worth listing: one per page, no trailing slash, no private ones. */
const publicPaths = (routes) => {
  const seen = new Set()
  for (const route of routes) {
    const path = String(route).replace(/\/+$/, '') || '/'
    if (path === '/' || PRIVATE.some((re) => re.test(path))) continue
    seen.add(path)
  }
  return [...seen].sort()
}

// No <lastmod>: a generate run rewrites every page, so the file time is the build time.
const urlEntry = (origin, path) =>
  [
    '  <url>',
    '    <loc>' + escapeXml(origin + path) + '</loc>',
    '    <changefreq>weekly</changefreq>',
    '    <priority>' + priorityOf(path).toFixed(1) + '</priority>',
    '  </url>',
  ].join('\n')

/**
 * Render `/sitemap.xml`.
 *
 * @param {Iterable<string>} routes - The generated route paths.
 * @param {object} options - { origin }.
 * @returns {string} The complete file, newline terminated.
 */
function buildSitemap(routes, { origin }) {
  return (
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...publicPaths(routes).map((path) => urlEntry(origin, path)),
      '</urlset>',
    ].join('\n') + '\n'
  )
}

/**
 * Render `/robots.txt`: everything is public and meant to be indexed; the
 * build assets and the pages that are not content are the exceptions.
 */
function buildRobots({ origin }) {
  return (
    [
      '# Everything here is demonstration content and is meant to be indexed,',
      '# quoted and cited, by search engines and by assistants alike.',
      '',
      'User-agent: *',
      'Allow: /',
      '',
      '# Build artefacts, and pages with nothing to index.',
      'Disallow: /_nuxt/',
      'Disallow: /node/preview/',
      'Disallow: /login',
      'Disallow: /callback',
      '',
      'Sitemap: ' + origin + '/sitemap.xml',
    ].join('\n') + '\n'
  )
}

module.exports = { buildSitemap, buildRobots, publicPaths, priorityOf }

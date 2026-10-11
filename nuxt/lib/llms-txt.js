/**
 * Builder for `/llms.txt`, the plain-text site index described at
 * https://llmstxt.org: an H1, a blockquote summary, orienting prose, then H2
 * sections of `- [name](url): notes` links.
 *
 * Pure and side-effect free, so it can be tested without a build.
 */

const { SITE_NAME, SITE_DESCRIPTION } = require('./site')

/** UTM params identifying assistant-sourced clicks; the canonical keeps them out of search. */
const UTM = 'utm_source=llms-txt&utm_medium=ai&utm_campaign=syndication'

const PREAMBLE = [
  "Umami is Drupal's demonstration food magazine, served here by a Nuxt frontend built with DruxtJS. Every page is Drupal content fetched over JSON:API and rendered by Vue components, with the site's own edit form, search and dev overlay as a demonstration of decoupled Drupal.",
  '',
  'Recipes and articles are the sample content that ships with Drupal. They are fictional, and the same set is published in English and Spanish.',
]

const SECTIONS = [
  { bundle: 'recipe', label: 'Recipes' },
  { bundle: 'article', label: 'Articles' },
  { bundle: 'page', label: 'Pages' },
]

const withUtm = (url) => url + '?' + UTM

const listItem = (title, url, notes) =>
  '- [' + title + '](' + url + ')' + (notes ? ': ' + notes : '')

/**
 * Render `/llms.txt`.
 *
 * English content is listed in full. The full-text companion and the
 * Spanish translations go under `## Optional`, the heading the format
 * reserves for what a reader can skip.
 *
 * @param {object[]} docs - Documents from readContent().
 * @param {object} options - { origin }.
 * @returns {string} The complete file, newline terminated.
 */
function buildLlmsTxt(docs, { origin }) {
  const lines = [
    '# ' + SITE_NAME,
    '',
    '> ' + SITE_DESCRIPTION.en,
    '',
    ...PREAMBLE,
  ]
  const items = (langcode, bundle) =>
    docs
      .filter((d) => d.langcode === langcode && d.bundle === bundle)
      .map((d) => listItem(d.title, withUtm(origin + d.path), d.description))

  for (const { bundle, label } of SECTIONS) {
    const list = items('en', bundle)
    if (list.length) lines.push('', '## ' + label, '', ...list)
  }

  // The full text stays bare: an assistant reads it and
  // nobody lands on it, and the Source: links inside carry their own tags.
  lines.push(
    '',
    '## Optional',
    '',
    listItem(
      'Full text',
      origin + '/llms-full.txt',
      'Every recipe, article and page in full, as one Markdown file.'
    )
  )
  const spanish = SECTIONS.flatMap(({ bundle }) => items('es', bundle))
  if (spanish.length) {
    lines.push('', 'The same content in Spanish:', '', ...spanish)
  }

  return lines.join('\n') + '\n'
}

module.exports = { buildLlmsTxt, withUtm, UTM }

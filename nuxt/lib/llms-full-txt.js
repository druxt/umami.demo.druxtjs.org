/**
 * Builder for `/llms-full.txt`: the content itself, in reading order, so an
 * assistant can take the site in one request instead of following the
 * links in `/llms.txt`.
 *
 * Pure and side-effect free, so it can be tested without a build.
 */

const { SITE_NAME, SITE_DESCRIPTION } = require('./site')
const { withUtm } = require('./llms-txt')

const ORDER = ['recipe', 'article', 'page']

/** One document as a section. */
const section = (doc, origin) => {
  const lines = [
    '## ' + doc.title,
    '',
    'URL: ' + withUtm(origin + doc.path),
    '',
  ]
  if (doc.description) lines.push(doc.description, '')
  if (doc.ingredients.length) {
    lines.push(
      '### Ingredients',
      '',
      ...doc.ingredients.map((i) => '- ' + i),
      ''
    )
  }
  if (doc.instructions) lines.push('### Method', '', doc.instructions, '')
  if (doc.body) lines.push(doc.body, '')
  return lines
}

/**
 * Render `/llms-full.txt`: English first, then Spanish, each in the order of
 * `/llms.txt`.
 *
 * @param {object[]} docs - Documents from readContent().
 * @param {object} options - { origin }.
 * @returns {string} The complete file, newline terminated.
 */
function buildLlmsFullTxt(docs, { origin }) {
  const lines = ['# ' + SITE_NAME, '', '> ' + SITE_DESCRIPTION.en, '']
  for (const langcode of ['en', 'es']) {
    const mine = ORDER.flatMap((bundle) =>
      docs.filter((d) => d.langcode === langcode && d.bundle === bundle)
    )
    if (!mine.length) continue
    if (langcode === 'es') lines.push('# En español', '')
    for (const doc of mine) lines.push(...section(doc, origin))
  }
  return (
    lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  )
}

module.exports = { buildLlmsFullTxt }

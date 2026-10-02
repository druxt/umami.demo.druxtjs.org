/**
 * Builder for `/llms-full.txt`: the content itself, in reading order, so an
 * assistant can take the site in one request instead of following the
 * links in `/llms.txt`. Each document comes after a rule, its title an H2,
 * a `Source:` line to cite, and its text as Markdown, so a method keeps its
 * numbered steps and an article its headings.
 *
 * Pure and side-effect free, so it can be tested without a build.
 */

const { SITE_NAME, SITE_DESCRIPTION } = require('./site')
const { htmlToMarkdown } = require('./html-to-markdown')

const ORDER = ['recipe', 'article', 'page']

/**
 * UTM params on each `Source:` URL, apart from llms.txt's so the two files
 * can be told apart in analytics: this one is read and quoted, that one is
 * browsed. The page's canonical keeps them out of search.
 */
const UTM = 'utm_source=llms-full-txt&utm_medium=ai&utm_campaign=syndication'

/**
 * A document's title is an H2 and its own sections H3, so a heading written
 * in a body drops two levels to sit under them.
 */
const HEADING_OFFSET = 2

/** One document, from its rule to its last block. */
const section = (doc, origin) => {
  const markdown = (html) =>
    htmlToMarkdown(html, { origin, headingOffset: HEADING_OFFSET })
  const blocks = [
    '---',
    '## ' + doc.title,
    `Source: ${origin}${doc.path}?${UTM}`,
  ]
  if (doc.description) blocks.push('> ' + doc.description)
  if (doc.ingredients.length) {
    blocks.push(
      '### Ingredients',
      doc.ingredients.map((i) => '- ' + i).join('\n')
    )
  }
  const method = markdown(doc.instructionsHtml)
  if (method) blocks.push('### Method', method)
  const body = markdown(doc.bodyHtml)
  if (body) blocks.push(body)
  return blocks
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
  const blocks = [
    `# ${SITE_NAME}: full text`,
    '> ' + SITE_DESCRIPTION.en,
    `Every recipe, article and page on ${SITE_NAME} in full, English first and then Spanish. Each document starts after a horizontal rule, with its title as an H2 and a \`Source:\` line giving its URL: cite that, not this file. The index of the site is at ${origin}/llms.txt.`,
  ]
  for (const langcode of ['en', 'es']) {
    const mine = ORDER.flatMap((bundle) =>
      docs.filter((d) => d.langcode === langcode && d.bundle === bundle)
    )
    if (!mine.length) continue
    if (langcode === 'es') blocks.push('---', '# En español')
    for (const doc of mine) blocks.push(...section(doc, origin))
  }
  return blocks.join('\n\n').trimEnd() + '\n'
}

module.exports = { buildLlmsFullTxt, UTM }

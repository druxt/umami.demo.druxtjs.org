/**
 * The site's content as documents, read from Drupal's JSON:API at build time
 * for the machine-readable files: llms.txt, llms-full.txt and the sitemap.
 *
 * Pure over the fetched data, so the shaping can be tested without Drupal.
 */

const { LANGCODES } = require('./site')

/** The bundles with a page of their own, and the fields those pages show. */
const BUNDLES = {
  recipe: [
    'title',
    'path',
    'field_summary',
    'field_ingredients',
    'field_recipe_instruction',
    'field_preparation_time',
    'field_cooking_time',
    'field_number_of_servings',
    'created',
    'changed',
  ],
  article: ['title', 'path', 'field_body', 'created', 'changed'],
  page: ['title', 'path', 'field_body', 'created', 'changed'],
}

/** Text without its markup, whitespace collapsed. */
const plainText = (html) =>
  String(html || '')
    .replace(/<\/(p|li|h[1-6]|div|br)>/gi, '$&\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')

const textOf = (field) =>
  !field
    ? ''
    : typeof field === 'string'
    ? field
    : field.processed || field.value || ''

/**
 * One JSON:API resource as a document.
 *
 * @param {object} resource - A node from a collection response.
 * @param {string} langcode - The language it was fetched in.
 * @returns {object} { path, langcode, bundle, title, description, ingredients, instructions, body, created, changed }
 */
const documentOf = (resource, langcode) => {
  const a = resource.attributes || {}
  const bundle = String(resource.type || '').replace('node--', '')
  const alias = (a.path || {}).alias
  return {
    path: `/${langcode}${alias || `/node/${a.drupal_internal__nid}`}`,
    langcode,
    bundle,
    title: a.title,
    description: plainText(
      textOf(a.field_summary) || textOf(a.field_body)
    ).split('\n')[0],
    ingredients: (a.field_ingredients || []).map((i) => plainText(i)),
    instructions: plainText(textOf(a.field_recipe_instruction)),
    body: plainText(textOf(a.field_body)),
    created: a.created,
    changed: a.changed,
  }
}

/**
 * Every published node of the site's bundles, in every language it is
 * translated to, in Drupal's own order.
 *
 * @param {string} baseUrl - Drupal's origin.
 * @param {function} get - `async (url) => data`: a JSON:API GET.
 * @returns {Promise<object[]>} Documents from documentOf().
 */
async function readContent(baseUrl, get) {
  const docs = []
  for (const langcode of LANGCODES) {
    for (const [bundle, fields] of Object.entries(BUNDLES)) {
      let url =
        `${baseUrl}/${langcode}/jsonapi/node/${bundle}` +
        `?filter[langcode]=${langcode}&fields[node--${bundle}]=${fields.join(
          ','
        )}` +
        `&sort=title&page[limit]=50`
      while (url) {
        const data = await get(url)
        for (const resource of data.data || [])
          docs.push(documentOf(resource, langcode))
        url = ((data.links || {}).next || {}).href || null
      }
    }
  }
  return docs
}

module.exports = { BUNDLES, plainText, documentOf, readContent }

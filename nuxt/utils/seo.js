import { demoLinks } from '~/utils/demo'
import {
  LOCALES,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_CARD,
  TWITTER_HANDLE,
  langcodeOf,
  canonicalUrl,
  absolute,
} from '~/lib/site'

/** Longest description worth emitting. Google truncates around 160 characters. */
const DESCRIPTION_LIMIT = 160

/** Text without its markup, whitespace collapsed. */
export const plainText = (html) =>
  String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

/** A description cut to a whole word within the limit. */
export const clampDescription = (text) => {
  const value = plainText(text)
  if (value.length <= DESCRIPTION_LIMIT) return value
  const cut = value.slice(0, DESCRIPTION_LIMIT)
  const space = cut.lastIndexOf(' ')
  return (space > 0 ? cut.slice(0, space) : cut).replace(/[,;:.]$/, '') + '…'
}

/** A Drupal text field's words: its summary when it has one, else its text. */
const textOf = (field) => {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field.summary || field.processed || field.value || ''
}

/** Minutes as an ISO 8601 duration, the form schema.org asks for. */
const minutes = (n) => (n ? `PT${Number(n)}M` : undefined)

const organizationGraph = (origin) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: origin + '/en',
  logo: origin + SITE_CARD,
})

const websiteGraph = (origin, langcode) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: origin + '/' + langcode,
  inLanguage: langcode,
})

/**
 * The page's head: the same set of tags druxtjs.org emits. One description,
 * Open Graph and Twitter cards, a canonical link, the html language and the
 * structured data.
 */
export function seoHead({
  origin,
  path,
  title,
  description,
  image,
  type = 'website',
  robots,
  graphs = [],
  twitter,
}) {
  const langcode = langcodeOf(path)
  const url = canonicalUrl(origin, path)
  const heading = title || SITE_TITLE[langcode]
  const summary = clampDescription(description || SITE_DESCRIPTION[langcode])
  const shareImage = image ? absolute(origin, image) : origin + SITE_CARD
  const shareTitle = title ? `${title} · ${SITE_NAME}` : heading

  return {
    htmlAttrs: { lang: langcode },
    title: heading,
    meta: [
      { hid: 'description', name: 'description', content: summary },
      ...(robots ? [{ hid: 'robots', name: 'robots', content: robots }] : []),

      { hid: 'og:type', property: 'og:type', content: type },
      { hid: 'og:title', property: 'og:title', content: shareTitle },
      { hid: 'og:description', property: 'og:description', content: summary },
      { hid: 'og:url', property: 'og:url', content: url },
      { hid: 'og:image', property: 'og:image', content: shareImage },
      { hid: 'og:site_name', property: 'og:site_name', content: SITE_NAME },
      { hid: 'og:locale', property: 'og:locale', content: LOCALES[langcode] },
      // The site card is 1200x630. A photograph is of unknown size, so it
      // gets no claim rather than a wrong one.
      ...(image
        ? []
        : [
            {
              hid: 'og:image:width',
              property: 'og:image:width',
              content: '1200',
            },
            {
              hid: 'og:image:height',
              property: 'og:image:height',
              content: '630',
            },
          ]),

      {
        hid: 'twitter:card',
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        hid: 'twitter:site',
        name: 'twitter:site',
        content: twitter || TWITTER_HANDLE,
      },
      { hid: 'twitter:title', name: 'twitter:title', content: shareTitle },
      {
        hid: 'twitter:description',
        name: 'twitter:description',
        content: summary,
      },
      { hid: 'twitter:image', name: 'twitter:image', content: shareImage },
    ],
    link: [{ hid: 'canonical', rel: 'canonical', href: url }],
    script: [
      {
        hid: 'ld-organization',
        type: 'application/ld+json',
        json: organizationGraph(origin),
      },
      {
        hid: 'ld-website',
        type: 'application/ld+json',
        json: websiteGraph(origin, langcode),
      },
      ...graphs.map((json, i) => ({
        hid: `ld-page-${i}`,
        type: 'application/ld+json',
        json,
      })),
    ],
  }
}

/** The first store copy of a resource, whichever language prefix holds it. */
const stored = (store, type, id) => {
  const byPrefix =
    (((store.state || {}).druxt || {}).resources || {})[type] || {}
  const doc = Object.values(byPrefix[id] || {}).find((o) => o && o.data)
  return (doc || {}).data
}

/** The URL of an entity's photograph: its media's file, as the frontend serves it. */
const photographOf = (store, entity) => {
  const media =
    ((entity.relationships || {}).field_media_image || {}).data || {}
  const image =
    media.id && stored(store, media.type || 'media--image', media.id)
  const file =
    image && (((image.relationships || {}).field_media_image || {}).data || {})
  const stored_ =
    file && file.id && stored(store, file.type || 'file--file', file.id)
  return (((stored_ || {}).attributes || {}).uri || {}).url || null
}

/** A recipe, an article or a page as schema.org describes them. */
const entityGraph = ({
  entity,
  origin,
  url,
  title,
  summary,
  image,
  langcode,
}) => {
  const a = entity.attributes || {}
  const publisher = { '@type': 'Organization', name: SITE_NAME }
  const shared = {
    '@context': 'https://schema.org',
    name: title,
    description: summary,
    url,
    inLanguage: langcode,
    ...(image ? { image: absolute(origin, image) } : {}),
    datePublished: a.created,
    dateModified: a.changed,
    author: publisher,
    publisher,
  }
  if (entity.type === 'node--recipe') {
    const steps = plainText(textOf(a.field_recipe_instruction))
    return {
      '@type': 'Recipe',
      ...shared,
      recipeIngredient: (a.field_ingredients || []).map((i) => plainText(i)),
      recipeInstructions: steps,
      prepTime: minutes(a.field_preparation_time),
      cookTime: minutes(a.field_cooking_time),
      recipeYield: a.field_number_of_servings
        ? `${a.field_number_of_servings} servings`
        : undefined,
    }
  }
  if (entity.type === 'node--article') {
    return { '@type': 'Article', ...shared, headline: title }
  }
  return { '@type': 'WebPage', ...shared }
}

/**
 * The head of a Druxt route: what the route resolved to, and the entity the
 * store holds for it once the page has fetched it. Reactive through the
 * store, so the tags fill in as the data lands.
 */
export function routeHead(vm) {
  const origin = (vm.$config || {}).siteOrigin || ''
  const twitter = demoLinks(vm).twitter
  const path = vm.$route.path
  const langcode = langcodeOf(path)
  const route =
    vm.route ||
    ((vm.$store.state.druxtRouter || {}).routes || {})[vm.$route.fullPath] ||
    (vm.$store.state.druxtRouter || {}).route ||
    {}
  const { type, uuid } = route.props || {}
  const entity = route.entity && type && uuid && stored(vm.$store, type, uuid)

  if (!entity) {
    return seoHead({
      origin,
      path,
      title: route.isHomePath ? undefined : route.label || undefined,
      twitter,
    })
  }

  const a = entity.attributes || {}
  const title = a.title || a.name
  const summary = clampDescription(
    textOf(a.field_summary) ||
      textOf(a.field_body) ||
      textOf(a.body) ||
      textOf(a.description) ||
      SITE_DESCRIPTION[langcode]
  )
  const image = photographOf(vm.$store, entity)
  const url = canonicalUrl(origin, path)
  const article = /^node--(recipe|article|page)$/.test(entity.type)
  return seoHead({
    origin,
    path,
    title,
    description: summary,
    image,
    twitter,
    type: article ? 'article' : 'website',
    graphs: article
      ? [entityGraph({ entity, origin, url, title, summary, image, langcode })]
      : [],
  })
}

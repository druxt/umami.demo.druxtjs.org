import axios from 'axios'

// The export carries field values as stored, markup and all: words only, so
// "<li>Preheat" indexes as "preheat" and a comment is not content.
const plain = (value) =>
  typeof value === 'string'
    ? value
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/,/g, ', ')
        .replace(/\s+/g, ' ')
        .trim()
    : value

/** A multi-value field's export, one value per entry. */
const listOf = (value) =>
  String(value || '')
    .split(',')
    .map((part) => plain(part))
    .filter(Boolean)

export default function (moduleOptions = {}) {
  // Default settings.
  const server = moduleOptions.server || 'default'
  const index = moduleOptions.index || 'default'

  // Fed once every module is in place, not while this one loads: the Lunr
  // module listens for documents only after it has been registered, and it
  // comes later in the list. Fed without waiting, it was a race the index lost.
  this.nuxt.hook('build:before', async () => {
    // Load settings data from the Drupal Search API Lunr module.
    const { data } = await axios.get(
      this.options.druxt.baseUrl + '/js-search/settings'
    )

    if (!data.servers[server] || !data.servers[server].indexes[index]) {
      return
    }

    let count = 0
    await Promise.all(
      data.servers[server].indexes[index].fileList.map(async (index) => {
        // Load index file.
        const file = await axios.get(index)

        // Iterate over documents and add to Nuxt.js Lunr module.
        for (const item of Object.values(file.data)) {
          // @TODO - Make document format smart or configurable.
          const document = { id: item._id }
          for (const [key, value] of Object.entries(item)) {
            document[key] = plain(value)
          }

          // One index per language: a Spanish page searches Spanish content.
          // The feed carries no langcode, and the path's prefix is Drupal's.
          const locale =
            (String(item.url || '').match(/^\/([a-z]{2})(\/|$)/) || [])[1] ||
            'en'

          await this.nuxt.callHook('lunr:document', {
            locale,
            document,
            // The facets: what a result is, its category and its tags.
            meta: {
              href: item.url,
              title: document.title,
              uuid: item.uuid,
              type: `node--${item.type}`,
              bundle: item.type,
              // Both can hold several values, which the export joins with commas.
              categories: listOf(item.field_recipe_category),
              tags: listOf(item.field_tags),
            },
          })
          count++
        }
      })
    )
    // eslint-disable-next-line no-console
    console.info(`search-api-lunr: ${count} documents fed to the Lunr index`)
  })
}

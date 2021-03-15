import axios from 'axios'

export default async function (moduleOptions = {}) {
  // Default settings.
  const server = moduleOptions.server || 'default'
  const index = moduleOptions.index || 'default'

  // Load settings data from the Drupal Search API Lunr module.
  const { data } = await axios.get(process.env.BASE_URL + '/js-search/settings')

  if (!data.servers[server] || !data.servers[server].indexes[index]) {
    return
  }

  // Iterate over index file list.
  data.servers[server].indexes[index].fileList.map(async (index) => {
    // Load index file.
    const file = await axios.get(index)

    // Iterate over documents and add to Nuxt.js Lunr module.
    for (const item of Object.values(file.data)) {
      // @TODO - Make document format smart or configurable.
      const document = {
        id: item._id,
        ...item,
      }

      this.nuxt.callHook('lunr:document', {
        document,
        meta: {
          href: item.url,
          title: document.title,
          uuid: item.uuid,
          type: `node--${item.type}`,
        },
      })
    }
  })
}

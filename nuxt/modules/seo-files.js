import fs from 'fs'
import path from 'path'
import axios from 'axios'

/**
 * What search engines, share cards and assistants read. The page head
 * (components/app/DruxtPage.vue) goes on the router's routes, and the
 * machine-readable files, robots.txt, sitemap.xml, llms.txt and
 * llms-full.txt, are written into the static export on `generate:done`,
 * against the routes the run wrote and the content Drupal holds.
 */
export default function () {
  // The router's routes, rendered by the site's own page: the same
  // component with a head of its own. The routes keep their language meta.
  // Registered after druxt-router's own extension, so the routes exist.
  this.extendRoutes((routes) => {
    for (const route of routes) {
      if (String(route.name || '').startsWith('druxt-router')) {
        route.component = path.resolve(
          this.options.srcDir,
          'components/app/DruxtPage.vue'
        )
      }
    }
  })

  this.nuxt.hook('generate:done', async (generator) => {
    const { siteOrigin } = require('../lib/site')
    const { readContent } = require('../lib/seo-content')
    const { buildLlmsTxt } = require('../lib/llms-txt')
    const { buildLlmsFullTxt } = require('../lib/llms-full-txt')
    const { buildSitemap, buildRobots } = require('../lib/sitemap')

    const origin = siteOrigin()
    const dir = generator.nuxt.options.generate.dir
    const get = async (url) =>
      (
        await axios.get(url, {
          headers: { Accept: 'application/vnd.api+json' },
        })
      ).data
    const docs = await readContent(this.options.druxt.baseUrl, get)
    const routes = [...(generator.generatedRoutes || [])]

    const files = {
      'robots.txt': buildRobots({ origin }),
      'sitemap.xml': buildSitemap(routes, { origin }),
      'llms.txt': buildLlmsTxt(docs, { origin }),
      'llms-full.txt': buildLlmsFullTxt(docs, { origin }),
    }
    for (const [name, body] of Object.entries(files)) {
      await fs.promises.writeFile(path.join(dir, name), body)
    }
    // eslint-disable-next-line no-console
    console.info(
      `seo-files: wrote ${Object.keys(files).join(', ')} for ${
        routes.length
      } routes and ${docs.length} documents at ${origin}`
    )
  })
}

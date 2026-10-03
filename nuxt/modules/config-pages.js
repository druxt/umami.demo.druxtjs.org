import { resolve, dirname } from 'path'
import configPages from '@druxt-contrib/config-pages'

/**
 * @druxt-contrib/config-pages, with a build that survives a missing page.
 *
 * The contrib module reads each config page from Drupal at build and throws
 * when one is not there. On a fresh deployment the site and Storybook build
 * against the previous Drupal, which provisioning replaces afterwards, so a
 * page added by the new release does not exist yet, and a throw here stops
 * the rollout before provisioning runs. Without the page the store holds no
 * fields, every link is empty, and the next build reads the page.
 */
export default async function (moduleOptions = {}) {
  try {
    await configPages.call(this, moduleOptions)
  } catch (error) {
    const pages = ((this.options.druxt || {}).configPages || {}).pages || []
    // eslint-disable-next-line no-console
    console.warn(
      `config-pages: ${error.message} The site builds without it; a rebuild reads it.`
    )
    this.options.store = true
    this.addPlugin({
      // The package's exports map hides its files, so the template is found
      // from its main entry, dist/index.ssr.js.
      src: resolve(
        dirname(require.resolve('@druxt-contrib/config-pages')),
        '../templates/plugin.js'
      ),
      fileName: 'store/druxt-config-pages.js',
      options: {
        configPages: Object.fromEntries(
          pages.map((page) => [page, { attributes: {}, relationships: {} }])
        ),
      },
    })
  }
}

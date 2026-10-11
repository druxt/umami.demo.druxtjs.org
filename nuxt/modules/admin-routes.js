import path from 'path'
import { ADMIN_PATHS } from '@druxt-contrib/admin'

/**
 * Drupal's admin paths, rendered by the site's admin page: a way through to
 * the same path on the backend. Ahead of the router's catch-all, which would
 * ask Drupal to translate a path it never serves as content.
 */
export default function () {
  this.extendRoutes((routes) => {
    const component = path.resolve(
      this.options.srcDir,
      'components/app/AdminPage.vue'
    )
    routes.unshift(
      ...ADMIN_PATHS.map((prefix) => ({
        name: `admin-${prefix.slice(1).replace(/\//g, '-')}`,
        path: `${prefix}*`,
        component,
      }))
    )
  })
}

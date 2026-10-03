/**
 * The `$druxtIce` plugin, rendered by Nuxt with the module's options.
 *
 * The store module is registered on both sides, so a page rendered on the
 * server or at generate time carries the cart's shape in its payload and the
 * client finds it there and keeps it. The connection is client-only: it
 * reads storage and the URL, and there is no browser on the server.
 *
 * `destination` is a module path rather than an object, because the options
 * reach here through `JSON.stringify` and an object of functions does not
 * survive that. It would arrive empty, the default would answer, and the site
 * would look as though it had configured nothing. Importing it here is the
 * same way Nuxt takes any other function through configuration.
 */
import { installIce, registerIceStore } from '@druxt-contrib/inline-content-edit'
<% if (options.destination) { %>import destination from '<%= options.destination %>'<% } else { %>const destination = null<% } %>

const options = <%= JSON.stringify(options) %>

export default async (context, inject) => {
  registerIceStore(context.store)
  if (!process.client) return undefined
  return installIce({ ...options, destination }, context, inject)
}

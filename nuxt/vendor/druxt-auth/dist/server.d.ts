/**
 * The password grant's server half: it adds the consumer, and its secret
 * where there is one, and asks Drupal for the token.
 *
 * @param {object} options - Options.
 * @param {string} options.tokenEndpoint - Drupal's `/oauth/token`.
 * @param {string} [options.clientId] - The consumer.
 * @param {string} [options.passwordClientId] - The password grant's own
 *   consumer, where the browser flow has a public one.
 * @param {string} [options.clientSecret] - A confidential consumer's secret.
 * @returns {Function} Connect-style middleware for POST requests.
 */
declare function passwordTokenHandler(options?: {
    tokenEndpoint: string;
    clientId?: string;
    passwordClientId?: string;
    clientSecret?: string;
}): Function;
/**
 * One connect-style middleware with every route the module adds to a
 * server: the password grant's token route, and, unless `proxy` is false,
 * Drupal's sign-in, session and OAuth paths answered on this origin.
 *
 * A request none of them answers goes to `next`, so the site's own handler
 * serves its files after this.
 *
 * @param {object} options - Options.
 * @param {string} options.baseUrl - Drupal's own origin.
 * @param {string} [options.clientId] - The consumer.
 * @param {string} [options.passwordClientId] - The password grant's consumer.
 * @param {string} [options.clientSecret] - A confidential consumer's secret.
 * @param {boolean} [options.proxy=true] - Whether to proxy Drupal's paths.
 * @returns {Function} Connect-style middleware.
 *
 * @example
 * const { createServerMiddleware } = require('druxt-auth/server')
 * const auth = createServerMiddleware({ baseUrl, clientId })
 * http.createServer((req, res) => auth(req, res, () => serveFiles(req, res)))
 */
declare function createServerMiddleware(options?: {
    baseUrl: string;
    clientId?: string;
    passwordClientId?: string;
    clientSecret?: string;
    proxy?: boolean;
}): Function;
/**
 * What this module needs from a server, for a site that brings its own.
 *
 * The Nuxt module registers these as server middleware, which `nuxt dev` and
 * `nuxt start` on a server target run. A static build runs neither: its files
 * are served by something else, a Node server of the site's own or a CDN with
 * a function in front. That server mounts `createServerMiddleware()` and gets
 * the same routes, so a static site signs in the way a server-rendered one
 * does, sessions and all.
 *
 * Node only. Imported from `druxt-auth/server`, never from the module's
 * index, so nothing here reaches a browser bundle.
 */
/** Where the password grant's browser half posts. */
declare const TOKEN_PATH: "/_auth/drupal-password/token";

export { TOKEN_PATH, createServerMiddleware, passwordTokenHandler };

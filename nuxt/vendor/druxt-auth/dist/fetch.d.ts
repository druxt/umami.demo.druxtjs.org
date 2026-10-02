/** The route a request is for, if any. */
declare function routeFor(method: any, path: any): {
    path: string;
    methods: string[];
} | {
    path: string;
    methods?: undefined;
};
/**
 * A `Set-Cookie` value, made to belong to this origin: the backend's `Domain`
 * goes, and `Secure` goes too when the reader came over plain HTTP, where a
 * browser would refuse to store it.
 */
declare function rewriteCookie(value: any, { secure }?: {
    secure?: boolean;
}): string;
/**
 * The handler.
 *
 * @param {object} options - Options.
 * @param {string} options.baseUrl - Drupal's own origin.
 * @param {string} [options.clientId] - The consumer.
 * @param {string} [options.passwordClientId] - The password grant's consumer.
 * @param {string} [options.clientSecret] - A confidential consumer's secret.
 * @param {boolean} [options.proxy=true] - Whether to proxy Drupal's paths.
 * @param {Function} [options.fetch] - The fetch to reach Drupal with.
 * @returns {Function} `(request) => Promise<Response>`, 404 for anything else.
 */
declare function createFetchHandler(options?: {
    baseUrl: string;
    clientId?: string;
    passwordClientId?: string;
    clientSecret?: string;
    proxy?: boolean;
    fetch?: Function;
}): Function;
/**
 * The module's server routes, as a web-standard handler: a `Request` in, a
 * `Response` out.
 *
 * `druxt-auth/server` gives a Node server these routes as middleware. This is
 * the same set for hosts that speak the Fetch API instead: Netlify and Vercel
 * functions, Cloudflare Workers, Deno. The module writes a Netlify or Vercel
 * function around it on its own after a static generate on those platforms.
 *
 * No dependencies and no Node built-ins, so a copy of the built file runs
 * wherever `fetch`, `Request` and `Response` exist.
 */
/** Where the password grant's browser half posts. */
declare const TOKEN_PATH: "/_auth/drupal-password/token";
/**
 * Every path these routes answer, and the methods they answer it for. The
 * JSON login, logout and password routes are Drupal's for POST alone: a GET
 * has to reach whatever page the site renders there, the login page this
 * module adds among them.
 */
declare const ROUTES: ({
    path: string;
    methods: string[];
} | {
    path: string;
    methods?: undefined;
})[];

export { ROUTES, TOKEN_PATH, createFetchHandler, rewriteCookie, routeFor };

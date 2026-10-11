/**
 * The demo's share links and commands, from Drupal's `druxt_demo` config
 * page (edited at /admin/config/system/druxt-demo), read at build by
 * @druxt-contrib/config-pages. One place for every URL the site shows
 * about itself, instead of the same addresses repeated through components.
 */

/** A link field as `{ href, title }`, empty when the page has none. */
const link = (value) => ({
  href: (value || {}).uri || '',
  title: (value || {}).title || '',
})

/** The host and path a link is shown as: no scheme, no `www.`. */
export const hostOf = (href) =>
  String(href || '')
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/$/, '')

/**
 * The config page as the components use it.
 *
 * @param {object} vm - A component with `$druxtConfigPages`.
 * @returns {object} { source, docs, druxtSource, druxtModule, discord, devpod, quickstart, twitter }
 */
export function demoLinks(vm) {
  const page = ((vm || {}).$druxtConfigPages || {}).get
    ? vm.$druxtConfigPages.get('druxt_demo') || {}
    : {}
  return {
    source: link(page.site_source),
    docs: link(page.druxt_docs),
    druxtSource: link(page.druxt_source),
    druxtModule: link(page.druxt_module),
    discord: link(page.discord),
    devpod: link(page.devpod),
    quickstart: page.quickstart || '',
    twitter: page.twitter || '',
  }
}

/** A mixin giving a component `demo`, the links above. */
export const demoMixin = {
  computed: {
    demo() {
      return demoLinks(this)
    },
  },
}

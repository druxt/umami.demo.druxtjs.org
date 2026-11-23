/**
 * druxt-ui-mami, the theme and the Umami components, with the demo's own
 * differences laid over the theme.
 *
 * The package reads its `druxtUiMami` options from nuxt.config.js and adds
 * its compiled theme to the page's CSS when it runs. The demo's differences
 * are custom properties the theme reads, added after it.
 */
export default async function () {
  await this.addModule('druxt-ui-mami')
  this.options.css.push('~/assets/css/umami-demo.css')
}

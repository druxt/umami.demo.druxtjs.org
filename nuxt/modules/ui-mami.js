/**
 * druxt-ui-mami, the theme and the Umami components, with the demo's own
 * differences laid over the theme.
 *
 * The package adds its compiled theme to the page's CSS when it runs, after
 * the stylesheets in nuxt.config.js. The demo's overrides have to follow it
 * to win at the same specificity, so they are added here, once it has run.
 *
 * The commit installed predates the package's rename: inside, it still reads
 * its options from `druxtUmamiUi`, and has itself transpiled by its old name. So
 * the `druxtUiMami` options are passed to it directly, and the components are
 * transpiled under the name they are installed by.
 */
export default async function (moduleOptions = {}) {
  this.options.build.transpile.push('druxt-ui-mami')
  await this.addModule([
    'druxt-ui-mami',
    { ...(this.options.druxtUiMami || {}), ...moduleOptions },
  ])
  this.options.css.push('~/assets/css/umami-demo.css')
}

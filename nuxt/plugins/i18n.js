import Vue from 'vue'
import VueI18n from 'vue-i18n'
import en from '~/locales/en'
import es from '~/locales/es'
import { langcodeOf } from '~/utils/lang'

Vue.use(VueI18n)

/**
 * The frontend's own words, in the language of the page. Drupal's content,
 * menus, labels and view titles arrive translated; this covers the chrome
 * and the notes the templates add, keyed by the route's language prefix.
 */
export default ({ app }) => {
  app.i18n = new VueI18n({
    locale: langcodeOf(app.context.route.path),
    fallbackLocale: 'en',
    messages: { en, es },
    silentFallbackWarn: true,
  })
  app.router.afterEach((to) => {
    app.i18n.locale = langcodeOf(to.path)
  })
}

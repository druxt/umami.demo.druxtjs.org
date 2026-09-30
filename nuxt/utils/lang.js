/** The languages this site serves, as Drupal prefixes them. */
export const LANGCODES = ['en', 'es']

/** The language a path is in, from its prefix; English when there is none. */
export const langcodeOf = (path) =>
  (String(path || '').match(/^\/(en|es)(\/|$)/) || [])[1] || 'en'

/** The same path in another language: the prefix swapped or added. */
export const localize = (path, langcode) => {
  const bare = String(path || '/').replace(/^\/(en|es)(?=\/|$)/, '')
  return `/${langcode}${bare === '/' ? '' : bare}`
}

/**
 * Where each language's version of the current page is. An entity keeps
 * its own alias per translation, so a prefix swap lands on a path Drupal
 * cannot resolve; its translation is asked for its path instead. A listing
 * keeps its path under the other prefix, and a page of the app's own, with
 * no language, leads to that language's home.
 */
export const switchPath = (path, code) =>
  /^\/(en|es)(\/|$)/.test(path) ? localize(path, code) : `/${code}`

export async function translatedPaths({ $druxt, $route, $store }) {
  const path = ($route || {}).path || '/'
  const paths = {}
  for (const code of LANGCODES) {
    paths[code] = switchPath(path, code)
  }
  const route = ((($store || {}).state || {}).druxtRouter || {}).route || {}
  const { type, uuid } = route.props || {}
  if (!route.entity || !type || !uuid || !$druxt) return paths
  await Promise.all(
    LANGCODES.filter((code) => code !== langcodeOf(path)).map(async (code) => {
      try {
        const { data } = await $druxt.getResource(
          type,
          uuid,
          { [`fields[${type}]`]: 'path' },
          `/${code}`
        )
        const alias = (((data || {}).attributes || {}).path || {}).alias
        if (alias) paths[code] = `/${code}${alias}`
      } catch (e) {
        // No translation to ask: the prefix swap stands.
      }
    })
  )
  return paths
}

/**
 * A language switch: `current`, and `path(code)` for each language's
 * version of the page, fetched on the server so the generated page carries
 * the right links. Set `fetchKey` on the component, so hydration finds them.
 */
export const langSwitchMixin = {
  data: () => ({ langPaths: {} }),

  async fetch() {
    this.langPaths = await translatedPaths(this)
  },

  computed: {
    current: ({ $route }) => langcodeOf(($route || {}).path),
  },

  watch: {
    '$route.path'() {
      this.$fetch()
    },
  },

  methods: {
    path(code) {
      return this.langPaths[code] || switchPath(this.$route.path, code)
    },
  },
}

/**
 * The page's language and prefix, for a component that builds paths. Named
 * `lang` because Druxt's entity and field components already own `langcode`.
 */
export const langMixin = {
  computed: {
    lang: ({ $route }) => langcodeOf(($route || {}).path),
    prefix: ({ lang }) => `/${lang}`,
  },

  methods: {
    /** A date as the language writes it. Fixed names, so server and browser agree. */
    formatDate(date, style = 'long') {
      const d = new Date(date)
      if (isNaN(d)) return ''
      const words = (this.$i18n.messages[this.$i18n.locale] || {}).date || {}
      const names = (style === 'short' ? words.monthsShort : words.months) || []
      return this.$t(`date.${style}`, {
        d: d.getUTCDate(),
        month: names[d.getUTCMonth()],
        y: d.getUTCFullYear(),
      })
    },
  },
}

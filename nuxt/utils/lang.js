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

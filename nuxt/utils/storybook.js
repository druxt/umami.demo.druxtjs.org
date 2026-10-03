/**
 * The Storybook that belongs to the site being viewed.
 *
 * Every Lagoon environment has its own: `app.<env>` is served beside
 * `storybook.<env>`, and production's is `storybook.umami.demo.druxtjs.org`.
 * A link to production's Storybook from a branch shows the wrong stories.
 */
export const PRODUCTION = 'https://storybook.umami.demo.druxtjs.org'

export function storybookOrigin(host) {
  const name = String(host || '')
  if (name.startsWith('app.')) return `https://storybook.${name.slice(4)}`
  if (name === 'umami.demo.druxtjs.org') return PRODUCTION
  if (/^(localhost|127\.0\.0\.1)(:|$)/.test(name))
    return 'http://localhost:3003'
  return PRODUCTION
}

/** A story's URL, by its Storybook id. */
export function storyUrl(host, id) {
  return `${storybookOrigin(host)}/?path=/story/${id}`
}

/**
 * A component's link to its own Storybook. The host is read after mount:
 * the server does not know it, and the first client render must match.
 */
export const storybookMixin = {
  data: () => ({ storybookHost: '' }),
  computed: {
    storybookOrigin: ({ storybookHost }) => storybookOrigin(storybookHost),
  },
  mounted() {
    this.storybookHost = window.location.host
  },
}

/** The id Storybook gives the story of one display of one entity type. */
export function entityStoryId(type, mode) {
  const [entity, bundle] = String(type).split('--')
  return `druxt-entity-${entity}-${bundle}-view-displays--${mode}`
}

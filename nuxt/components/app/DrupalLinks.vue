<template>
  <!-- Behind the curtain: the same node on Drupal's own screens. An editor
       signed in here may still be asked by Drupal to sign in there; it sends
       them on to the screen they asked for. -->
  <b-dropdown
    v-if="links.length"
    class="drupal-links"
    no-caret
    right
    size="sm"
    toggle-class="drupal-links__toggle"
    variant="link"
  >
    <template #button-content>
      {{ $t('drupal.menu') }} <span aria-hidden="true">↗</span>
    </template>
    <b-dropdown-item
      v-for="link of links"
      :key="link.key"
      :href="link.href"
      link-class="drupal-links__item"
      rel="noopener"
      target="_blank"
    >
      {{ $t(`drupal.${link.key}`) }}
      <span class="sr-only">{{ $t('drupal.newTab') }}</span>
    </b-dropdown-item>
  </b-dropdown>
</template>

<script>
/** Drupal's screens for a node, in the order an editor reaches for them. */
const SCREENS = [
  { key: 'edit', path: 'edit' },
  { key: 'revisions', path: 'revisions' },
  { key: 'translations', path: 'translations' },
]

export default {
  props: {
    /** The node's ID, as Drupal numbers it. */
    nid: { type: [String, Number], default: null },
    /** The language the page is in: its translation is the one edited. */
    langcode: { type: String, default: 'en' },
  },

  computed: {
    links() {
      const origin = this.$config.drupalOrigin
      if (!origin || !this.nid) return []
      return SCREENS.map(({ key, path }) => ({
        key,
        href: `${origin}/${this.langcode}/node/${this.nid}/${path}`,
      }))
    },
  },
}
</script>

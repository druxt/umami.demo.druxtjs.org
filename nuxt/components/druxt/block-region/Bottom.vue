<template>
  <div class="site-footer__grid">
    <div class="site-footer__col">
      <span class="site-footer__wordmark">Umami</span>
      <!-- The disclaimer block. -->
      <slot name="umami_disclaimer" />
    </div>

    <DruxtMenu class="site-footer__col" component="nav" name="footer">
      <template #default="{ items }">
        <span class="site-footer__kicker">Magazine</span>
        <DruxtMenuItem
          v-for="item in items"
          :key="item.entity.id"
          :item="item"
        />
      </template>

      <template #item="{ item: { entity }, to }">
        <nuxt-link class="site-footer__link" :to="to">
          {{ entity.attributes.title }}
        </nuxt-link>
      </template>
    </DruxtMenu>

    <div class="site-footer__col site-footer__col--demo">
      <span class="site-footer__kicker site-footer__kicker--demo"
        >This demo</span
      >
      <nuxt-link
        class="site-footer__link site-footer__link--demo"
        to="/entity-explorer"
      >
        Entity Explorer
      </nuxt-link>
      <a
        v-for="link in links"
        :key="link.href"
        class="site-footer__link site-footer__link--demo"
        :href="link.href"
        rel="noopener"
        target="_blank"
      >
        {{ link.title }}
      </a>
    </div>

    <div class="site-footer__base">
      <span>© {{ year }} Umami Publications</span>
      <nuxt-link to="/terms-and-conditions">Terms &amp; Conditions</nuxt-link>
    </div>
  </div>
</template>

<script>
/**
 * The `bottom` region. It used to render the disclaimer block alone, which
 * left the site with a one-line footer. The footer menu is pulled in here
 * directly (DruxtMenu name="footer"): MenuBlockFooter filters that menu down
 * to a single contact button, so every other item was being discarded.
 */
export default {
  data: () => ({
    links: [
      {
        title: 'View source',
        href: 'https://github.com/druxt/umami.demo.druxtjs.org',
      },
      { title: 'Docs', href: 'https://druxtjs.org' },
      { title: 'Discord', href: 'https://discord.druxtjs.org' },
      { title: 'Storybook', href: 'https://storybook.umami.demo.druxtjs.org' },
    ],
  }),

  computed: {
    year: () => new Date().getFullYear(),
  },
}
</script>

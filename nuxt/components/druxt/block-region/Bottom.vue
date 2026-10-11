<template>
  <div class="site-footer__grid">
    <div class="site-footer__col">
      <span class="site-footer__wordmark">Umami</span>
      <span class="site-footer__kicker site-footer__kicker--brand">Umami</span>
      <!-- The disclaimer block. -->
      <slot name="umami_disclaimer" />
    </div>

    <DruxtMenu
      class="site-footer__col site-footer__col--menu"
      component="nav"
      name="footer"
    >
      <template #default="{ items }">
        <span class="site-footer__kicker">{{ $t('site.magazine') }}</span>
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
      <span class="site-footer__kicker site-footer__kicker--demo">{{
        $t('site.thisDemo')
      }}</span>
      <nuxt-link
        class="site-footer__link site-footer__link--demo"
        to="/entity-explorer"
      >
        Entity Explorer
      </nuxt-link>
      <nuxt-link class="site-footer__link site-footer__link--demo" to="/play">
        Umami Go
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

    <!-- The disclaimer block's copyright, on its own line under the columns. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-if="copyright" class="site-footer__base" v-html="copyright" />
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { demoMixin } from '~/utils/demo'
import { storybookMixin } from '~/utils/storybook'
/**
 * The `bottom` region. It used to render the disclaimer block alone, which
 * left the site with a one-line footer. The footer menu is pulled in here
 * directly (DruxtMenu name="footer"): MenuBlockFooter filters that menu down
 * to a single contact button, so every other item was being discarded.
 */

export default {
  mixins: [demoMixin, storybookMixin],

  props: {
    /** The region's block resources, from DruxtBlockRegion. */
    blocks: {
      type: Array,
      default: () => [],
    },
  },

  data: () => ({
    copyright: null,
  }),

  async fetch() {
    const block = this.blocks.find(
      (o) => (o.attributes || {}).drupal_internal__id === 'umami_disclaimer'
    )
    if (!block) {
      return
    }
    // The region asks only for ids and weights, so the block's settings,
    // which name its content, are fetched here.
    const placed = await this.getResource({
      type: block.type,
      id: block.id,
      query: { fields: { [block.type]: 'settings' } },
    })
    const id =
      ((((placed || {}).data || {}).attributes || {}).settings || {}).id || ''
    const uuid = id.split(':')[1]
    if (!uuid) {
      return
    }
    const type = 'block_content--disclaimer_block'
    const resource = await this.getResource({
      type,
      id: uuid,
      query: { fields: { [type]: 'field_copyright' } },
    })
    const field = (((resource || {}).data || {}).attributes || {})
      .field_copyright
    this.copyright = (field || {}).processed || null
  },

  computed: {
    /** The Druxt links from Drupal's config page, with this environment's own Storybook. */
    links: ({ demo, storybookOrigin }) => [
      demo.source,
      demo.docs,
      demo.discord,
      { title: 'Storybook', href: storybookOrigin },
    ],
  },

  methods: {
    ...mapActions({
      getResource: 'druxt/getResource',
    }),
  },
}
</script>

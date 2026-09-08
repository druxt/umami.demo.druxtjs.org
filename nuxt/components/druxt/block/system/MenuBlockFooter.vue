<template>
  <div class="feedback">
    <h2 class="feedback__title">Tell us what you think</h2>

    <p class="feedback__copy">
      The form is a Drupal contact form, rendered by
      <code>DruxtEntityForm</code> and validated against the same field config.
    </p>

    <!-- The menu item is used when it exists; otherwise the contact route is
         linked directly. Previously this block filtered the footer menu down
         to `contact.site_page` and rendered nothing at all when the deployed
         menu did not contain it — leaving a bare <h2>. -->
    <DruxtMenu component="div" name="footer">
      <template #default="{ items }">
        <b-button
          v-if="contact(items)"
          :to="contact(items).to"
          variant="primary"
        >
          {{ contact(items).title }}
        </b-button>
        <b-button v-else :to="fallback" variant="primary">
          Send us feedback
        </b-button>
      </template>
    </DruxtMenu>
  </div>
</template>

<script>
import { DruxtBlocksBlockMixin } from 'druxt-blocks'

export default {
  mixins: [DruxtBlocksBlockMixin],

  computed: {
    fallback() {
      const lang = (this.$route.path.match(/^\/(en|es)(\/|$)/) || [])[1] || 'en'
      return `/${lang}/contact`
    },
  },

  methods: {
    contact(items = []) {
      const match = items.find((i) => i.entity.id === 'contact.site_page')
      if (!match) {
        return null
      }
      return {
        title: match.entity.attributes.title,
        to: match.entity.attributes.url || this.fallback,
      }
    },
  },
}
</script>

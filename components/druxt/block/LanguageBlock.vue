<template>
  <b-nav-item-dropdown v-if="!$fetchState.pending">
    <template #button-content>
      <CountryFlag
        :country="country(selected.attributes.drupal_internal__id)"
      />
    </template>
    <b-dropdown-item
      v-for="language of languages.filter((o) => o.attributes.drupal_internal__id !== 'und')"
      :key="language.attributes.drupal_internal__id"
      @click="changeLanguage(language.attributes.drupal_internal__id)"
    >
      <CountryFlag
        class="align-bottom"
        :country="country(language.attributes.drupal_internal__id)"
      />

      {{ language.attributes.label }}
    </b-dropdown-item>
  </b-nav-item-dropdown>

  <span v-else />
</template>

<script>
import { DrupalJsonApiParams } from 'drupal-jsonapi-params'
import { DruxtBlocksBlockMixin } from 'druxt-blocks'

import CountryFlag from 'vue-country-flag'

export default {
  components: { CountryFlag },

  mixins: [DruxtBlocksBlockMixin],

  data: () => ({
    languages: [],
  }),

  async fetch() {
    const resourceType = 'configurable_language--configurable_language'
    const query = new DrupalJsonApiParams()
      .addFilter('drupal_internal__id', ['zxx'], 'NOT IN')
      .addFields(resourceType, ['drupal_internal__id', 'label', 'langcode'])
    this.languages = (await this.$store.dispatch('druxt/getCollection', {
      type: resourceType,
      query
    })).data
  },

  computed: {
    selected: ({ $route, languages }) => ($route.meta || {}).langcode
      ? languages.find((o) => o.attributes.drupal_internal__id === $route.meta.langcode)
      : (languages.find((o) => o.attributes.drupal_internal__id === ((languages.find((o) => o.attributes.drupal_internal__id === 'und') || {}).attributes || {}).langcode) || {}),

    route: ({ $store }) => $store.state.druxtRouter.route
  },

  methods: {
    async changeLanguage(langcode) {
      switch (this.route.type) {
        case 'entity': {
          const { data } = await this.$store.dispatch('druxt/getResource', {
            type: this.route.props.type,
            id: this.route.props.uuid,
            prefix: langcode,
            query: new DrupalJsonApiParams().addFields(this.route.props.type, ['path'])
          })
          this.$router.push({ path: `/${langcode}${data.attributes.path.alias}` })
        }
        break

        // Redirect to the correctly prefixed path.
        default: {
          const parts = this.route.resolvedPath.split('/')
          parts[1] = langcode
          this.$router.push({ path: parts.join('/') })
        }
      }
    },

    country: (langcode) => (Object.entries({
      en: 'gb'
    }).filter(([k, v]) => k === langcode)).map(([k, v]) => v).pop() || langcode
  }
}
</script>

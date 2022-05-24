<template>
  <b-nav-item-dropdown
    v-if="!$fetchState.pending"
    :text="selected"
  >
    <b-dropdown-item
      v-for="language of languages.filter((o) => o.attributes.drupal_internal__id !== 'und')"
      :key="language.attributes.drupal_internal__id"
      :to="`/${language.attributes.drupal_internal__id}`"
    >
      {{ language.attributes.label }}
    </b-dropdown-item>
  </b-nav-item-dropdown>

  <span v-else />
</template>

<script>
import { DrupalJsonApiParams } from 'drupal-jsonapi-params'
import { DruxtBlocksBlockMixin } from 'druxt-blocks'

export default {
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
      ? (languages.find((o) => o.attributes.drupal_internal__id === $route.meta.langcode).attributes || {}).label || ''
      : ((languages.find((o) => o.attributes.drupal_internal__id === ((languages.find((o) => o.attributes.drupal_internal__id === 'und') || {}).attributes || {}).langcode) || {}).attributes || {}).label || '',
  }
}
</script>

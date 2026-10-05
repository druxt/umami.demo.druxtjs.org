<template>
  <div class="searchbar">
    <div class="searchbar__head">
      <div
        v-if="!compact"
        class="d-flex align-items-center justify-content-between mb-3"
      >
        <h2 class="mb-0">Search</h2>
        <b-button v-b-toggle.search class="searchbar__close" variant="link">
          ×
        </b-button>
      </div>

      <div class="searchbar__field">
        <BIconSearch aria-hidden="true" class="searchbar__icon" />
        <b-form-input
          ref="input"
          v-model="searchText"
          :autofocus="!compact"
          debounce="60"
          :placeholder="compact ? 'Search recipes' : placeholder"
          type="search"
        />
      </div>

      <!-- One line in the drawer: 330px does not fit two phrases. -->
      <div class="searchbar__meta">
        <span v-if="resultsVisible">{{ searchResults.length }} results</span>
        <span v-else-if="!compact">Results appear as you type</span>
        <span class="searchbar__engine">lunr · no request</span>
      </div>
    </div>

    <div class="searchbar__results">
      <nuxt-link
        v-for="(item, key) of searchResults"
        :key="key"
        class="searchbar__result"
        :to="searchMeta[item.ref].href"
      >
        <!-- The drawer is 330px wide: a title per row, not a teaser card. -->
        <span v-if="compact">{{ searchMeta[item.ref].title }}</span>
        <Druxt
          v-else
          module="entity"
          mode="teaser"
          :type="searchMeta[item.ref].type"
          :uuid="searchMeta[item.ref].uuid"
        />
      </nuxt-link>
    </div>

    <div v-if="!compact" class="searchbar__note">
      <span class="druxt-note__kicker">How this works</span>
      <p class="druxt-note__body mt-1 mb-0">
        Drupal's Search API index is compiled to a Lunr index at build time and
        bundled with the app, so every keystroke searches locally and the site
        stays static.
      </p>
    </div>
  </div>
</template>

<script>
import { BIconSearch } from 'bootstrap-vue'
import LunrSearch from 'lunr-module/search'

export default {
  components: { BIconSearch },

  extends: LunrSearch,

  props: {
    /**
     * Drop the panel chrome: the heading, its close button and the footer
     * note. The drawer supplies its own, and the long placeholder does not
     * fit a 330px panel.
     */
    compact: {
      type: Boolean,
      default: false,
    },
  },

  data: () => ({
    placeholder: 'Try “brownie”, “quiche”, “mushroom”',
  }),

  methods: {
    /** Called by the drawer when the masthead's search button opened it. */
    focus() {
      const input = this.$refs.input
      if (input) {
        input.focus()
      }
    },
  },
}
</script>

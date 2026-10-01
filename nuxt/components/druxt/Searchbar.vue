<template>
  <div class="searchbar">
    <div class="searchbar__head">
      <div
        v-if="!compact"
        class="d-flex align-items-center justify-content-between mb-3"
      >
        <h2 class="mb-0">{{ $t('nav.search') }}</h2>
        <b-button v-b-toggle.search class="searchbar__close" variant="link">
          ×
        </b-button>
      </div>

      <div class="searchbar__field">
        <BIconSearch aria-hidden="true" class="searchbar__icon" />
        <b-form-input
          ref="input"
          v-model="searchText"
          debounce="60"
          :placeholder="$t('search.placeholder')"
          type="search"
          @focus="select"
          @keydown.esc.prevent
        />
      </div>

      <!-- One line in the drawer: 330px does not fit two phrases. -->
      <div class="searchbar__meta">
        <span v-if="resultsVisible && searchResults.length"
          >{{ searchResults.length }}
          {{ $tc('search.results', searchResults.length) }}</span
        >
        <!-- Nothing found, or nothing typed yet: a query that finds plenty. -->
        <span v-else>
          {{
            searchText ? $t('search.none') : compact ? '' : $t('search.hint')
          }}
          <button class="searchbar__example" type="button" @click="tryExample">
            {{ $t('search.try', { example: $t('search.example') }) }}
          </button>
        </span>
        <span class="searchbar__engine">{{ $t('search.engine') }}</span>
      </div>
    </div>

    <div ref="results" class="searchbar__results" @scroll.passive="onScroll">
      <!-- The drawer is 330px wide: a title per row, not a teaser card. The
           panel shows the teaser, which is a link of its own, so the row is
           not one: a link inside a link is invalid markup. -->
      <!-- Keyed by the result, not its position: a row reused for another
           result kept the last one's link while the new one loaded. -->
      <template v-for="item of searchResults">
        <nuxt-link
          v-if="compact"
          :key="item.ref"
          class="searchbar__result"
          :to="searchMeta[item.ref].href"
        >
          {{ searchMeta[item.ref].title }}
        </nuxt-link>
        <div v-else :key="item.ref" class="searchbar__result">
          <Druxt
            module="entity"
            mode="teaser"
            :type="searchMeta[item.ref].type"
            :uuid="searchMeta[item.ref].uuid"
          />
        </div>
      </template>
    </div>

    <div v-if="!compact" class="searchbar__note">
      <span class="druxt-note__kicker">{{ $t('note.howThisWorks') }}</span>
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
import lunr from 'lunr'
import LunrSearch from 'lunr-module/search'
import { langcodeOf } from '~/utils/lang'

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
    /** How far down the results were read, kept while the panel is closed. */
    scrolled: 0,
  }),

  computed: {
    /** The page's language picks the index: a Spanish page finds Spanish content. */
    language: ({ $route }) => langcodeOf(($route || {}).path),
  },

  watch: {
    /** A new query is read from its first result. */
    searchText() {
      this.scrolled = 0
    },
  },

  /**
   * A closed panel is display: none, and the browser drops a hidden box's
   * scroll offset. When the list has a size again, it goes back to where the
   * reader left it.
   */
  mounted() {
    if (typeof ResizeObserver === 'undefined') return
    this.resizes = new ResizeObserver(() => {
      const list = this.$refs.results
      if (list && list.clientHeight && list.scrollTop !== this.scrolled) {
        list.scrollTop = this.scrolled
      }
    })
    this.resizes.observe(this.$refs.results)
  },

  beforeDestroy() {
    if (this.resizes) this.resizes.disconnect()
  },

  methods: {
    // cspell:ignore tomatos
    /**
     * Each word as typed, as the start of a longer word, and within one
     * letter for longer words, so "choc" and "tomatos" find their recipes.
     * Typed text is never Lunr query syntax: a stray ":" or "~" stays text.
     */
    async search(text) {
      // loadIndex answers undefined when its cache serves the index, as it
      // does for the second search bar, so test the index itself.
      if (!this.searchIndex) await this.loadIndex()
      if (!this.searchIndex) return
      const words = lunr
        .tokenizer(text)
        .map((token) => token.toString().replace(/[^\p{L}\p{N}]/gu, ''))
        .filter(Boolean)
      this.searchResults = words.length
        ? this.searchIndex.query((query) => {
            for (const word of words) {
              query.term(word, { boost: 10 })
              query.term(word, {
                boost: 3,
                usePipeline: false,
                wildcard: lunr.Query.wildcard.TRAILING,
              })
              if (word.length > 4) {
                query.term(word, {
                  boost: 1,
                  editDistance: 1,
                  usePipeline: false,
                })
              }
            }
          })
        : []
      this.openResults()
    },

    /** A hidden list reports 0 as it closes; only a visible one counts. */
    onScroll({ target }) {
      if (target.clientHeight) this.scrolled = target.scrollTop
    },

    /** Back in a field that holds a query: selected, so typing replaces it. */
    select(event) {
      if (event && event.target && event.target.select) event.target.select()
    },

    tryExample() {
      this.searchText = this.$t('search.example')
      this.focus()
    },

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

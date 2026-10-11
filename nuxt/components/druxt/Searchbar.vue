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
      <!-- A status: the count, nothing found or the index unavailable is read
           out as it changes. -->
      <div class="searchbar__meta" role="status">
        <span v-if="failed">{{ $t('search.unavailable') }}</span>
        <span v-else-if="resultsVisible && searchResults.length"
          >{{ shownResults.length }}
          {{ $tc('search.results', shownResults.length) }}</span
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

    <!-- Facets of the results: what they are, their category, their tags.
         The drawer is too narrow for more than what they are. -->
    <div v-if="facets.length" class="searchbar__facets">
      <div
        v-for="facet of facets"
        :key="facet.key"
        :aria-label="$t(`search.facet.${facet.key}`)"
        class="searchbar__facet"
        role="group"
      >
        <button
          v-for="option of facet.options"
          :key="option.value"
          :aria-pressed="String(filters[facet.key] === option.value)"
          class="searchbar__chip"
          :disabled="!option.count && filters[facet.key] !== option.value"
          type="button"
          @click="toggle(facet.key, option.value)"
        >
          {{ option.label }}
          <span class="searchbar__count">{{ option.count }}</span>
        </button>
      </div>
    </div>

    <div ref="results" class="searchbar__results" @scroll.passive="onScroll">
      <!-- The drawer is 330px wide: a title per row, not a teaser card. The
           panel shows the teaser, which is a link of its own, so the row is
           not one: a link inside a link is invalid markup. -->
      <!-- Keyed by the result, not its position: a row reused for another
           result kept the last one's link while the new one loaded. -->
      <template v-for="item of shownResults">
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
      <p class="druxt-note__body mt-1 mb-0">{{ $t('note.searchBody') }}</p>
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
    /** The chosen value of each facet; null shows every result. */
    filters: { bundle: null, category: null, tag: null },
    /** The index could not be fetched: say so, not "nothing found". */
    failed: false,
  }),

  computed: {
    /** Each result's facet values, from the meta the index carries. */
    valuesOf:
      ({ searchMeta }) =>
      (item) => {
        const meta = (searchMeta || {})[item.ref] || {}
        return {
          bundle: meta.bundle ? [meta.bundle] : [],
          category: meta.categories || [],
          tag: meta.tags || [],
        }
      },

    /** The results under every chosen facet value but `except`'s. */
    matching:
      ({ searchResults, filters, valuesOf }) =>
      (except) =>
        (searchResults || []).filter((item) => {
          const values = valuesOf(item)
          return Object.entries(filters).every(
            ([key, chosen]) =>
              key === except || !chosen || values[key].includes(chosen)
          )
        }),

    /** The results under every chosen facet value. */
    shownResults: ({ matching }) => matching(null),

    /**
     * The facets worth showing, and a facet only when it tells results apart.
     * The values, and their order, come from the whole query, so the chips
     * stay put as filters change. Each count is what choosing that value
     * would show, under every filter chosen in the other facets: a value
     * that would show nothing reads 0 and cannot be chosen. Tags are many:
     * the six most frequent, and any chosen one.
     */
    facets() {
      if (!this.searchResults || this.searchResults.length < 2) return []
      const keys = this.compact ? ['bundle'] : ['bundle', 'category', 'tag']
      const tally = (items, key) => {
        const counts = {}
        for (const item of items) {
          for (const value of this.valuesOf(item)[key]) {
            counts[value] = (counts[value] || 0) + 1
          }
        }
        return counts
      }
      return keys
        .map((key) => {
          const total = tally(this.searchResults, key)
          const narrowed = tally(this.matching(key), key)
          let options = Object.entries(total)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([value, all]) => ({
              value,
              all,
              count: narrowed[value] || 0,
              label: key === 'bundle' ? this.$t(`bundle.${value}`) : value,
            }))
          if (key === 'tag') {
            options = options.filter(
              (option, index) => index < 6 || option.value === this.filters.tag
            )
          }
          const tellsApart =
            options.length > 1 ||
            (options[0] && options[0].all < this.searchResults.length)
          return { key, options: tellsApart ? options : [] }
        })
        .filter((facet) => facet.options.length)
    },

    /** The page's language picks the index: a Spanish page finds Spanish content. */
    language: ({ $route }) => langcodeOf(($route || {}).path),
  },

  watch: {
    /**
     * A new query is read from its first result, every facet open. An empty
     * field shows nothing: the base leaves the last results, and a search
     * still waiting on its timer.
     */
    searchText(value) {
      this.reset()
      if (!value) {
        clearTimeout(this.searchTimeout)
        this.searchResults = []
      }
    },

    /** Another language is another index: its names fit no chosen facet. */
    language() {
      this.reset()
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
    // cspell:ignore garlik
    /**
     * Each word as typed, as the start of a longer word, and within one
     * letter for longer words, so "choc" and "garlik" find their recipes.
     * Typed text is never Lunr query syntax: a stray ":" or "~" stays text.
     */
    async search(text) {
      // loadIndex answers undefined when its cache serves the index, as it
      // does for the second search bar, so test the index itself.
      if (!this.searchIndex) await this.loadIndex()
      this.failed = !this.searchIndex
      if (!this.searchIndex) return
      // The field as it is now: typing went on while the index loaded.
      const words = lunr
        .tokenizer(this.searchText || '')
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

    /** Every facet open and the list at its top. */
    reset() {
      this.filters = { bundle: null, category: null, tag: null }
      this.scrolled = 0
      if (this.$refs.results) this.$refs.results.scrollTop = 0
    },

    /** A chip chooses its value, or clears it when chosen already. */
    toggle(key, value) {
      this.filters = {
        ...this.filters,
        [key]: this.filters[key] === value ? null : value,
      }
      this.scrolled = 0
      if (this.$refs.results) this.$refs.results.scrollTop = 0
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

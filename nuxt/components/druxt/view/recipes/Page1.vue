<template>
  <div>
    <!-- Filters. Drupal returns the full result set once; everything below
         this line happens in the browser.

         Below md this collapses to a stack: the field full width, difficulty
         and duration in one sideways scroller, then sort and count on a row
         together. See .recipe-filters in assets/scss/theme.scss. -->
    <div class="recipe-filters">
      <b-form-input
        v-model="query"
        class="recipe-filters__field masthead__search"
        debounce="120"
        placeholder="Filter by ingredient"
        type="search"
      />

      <div class="recipe-filters__group recipe-filters__group--scroll">
        <span class="stat-grid__label">Difficulty</span>
        <b-button
          v-for="option of difficulties"
          :key="option"
          :pressed="difficulty === option"
          size="sm"
          :variant="difficulty === option ? 'primary' : 'outline-secondary'"
          @click="difficulty = difficulty === option ? null : option"
        >
          {{ option }}
        </b-button>
      </div>

      <div class="recipe-filters__row">
        <div class="recipe-filters__group">
          <span class="stat-grid__label">Sort</span>
          <b-form-select
            v-model="sort"
            :options="sortOptions"
            size="sm"
            style="width: auto"
          />
        </div>

        <span class="recipe-filters__count">
          {{ filtered.length }} of {{ results.length }} · client-side
        </span>
      </div>
    </div>

    <!-- md=4 gives three across the tablet band, where sm=6 lg=3 showed two
         cards 340px wide. -->
    <b-row>
      <b-col
        v-for="result of filtered"
        :key="result.id"
        class="mb-4"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <DruxtEntity mode="card" :type="result.type" :uuid="result.id" />
      </b-col>
    </b-row>

    <p v-if="!filtered.length" class="text-center py-5" style="color: #8a7f70">
      Nothing matches those filters yet.
    </p>

    <AppDruxtNote
      class="mt-4"
      title="Drupal's Recipes view, filtered without a page load"
      cta="Read the Views guide"
      href="https://druxtjs.org/modules/views"
    >
      Druxt fetches the view's result set once, then sorting and filtering
      happen in the browser. In a traditional Drupal theme each of these
      controls is an exposed filter and a full round trip.
    </AppDruxtNote>
  </div>
</template>

<script>
import { DruxtViewsViewMixin } from 'druxt-views'

const attr = (result, field) => (result.attributes || {})[field]

export default {
  mixins: [DruxtViewsViewMixin],

  data: () => ({
    difficulties: ['Easy', 'Medium', 'Hard'],
    difficulty: null,
    query: '',
    sort: 'title',
    sortOptions: [
      { value: 'title', text: 'A–Z' },
      { value: 'time', text: 'Quickest first' },
    ],
  }),

  computed: {
    filtered() {
      const query = this.query.trim().toLowerCase()

      const matches = (this.results || []).filter((result) => {
        if (
          this.difficulty &&
          (attr(result, 'field_difficulty') || '').toLowerCase() !==
            this.difficulty.toLowerCase()
        ) {
          return false
        }

        if (!query) {
          return true
        }

        const haystack = [
          attr(result, 'title'),
          ...(attr(result, 'field_ingredients') || []),
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(query)
      })

      return [...matches].sort((a, b) =>
        this.sort === 'time'
          ? (attr(a, 'field_cooking_time') || 0) -
            (attr(b, 'field_cooking_time') || 0)
          : String(attr(a, 'title')).localeCompare(String(attr(b, 'title')))
      )
    },
  },

  /**
   * The view's own field list is filtered by bundle; ask for the fields the
   * client-side filters need.
   */
  druxt: {
    query: {
      fields: [
        'field_cooking_time',
        'field_difficulty',
        'field_ingredients',
        'path',
        'title',
      ],
    },
  },
}
</script>

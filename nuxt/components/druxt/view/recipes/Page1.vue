<template>
  <div>
    <!-- Filters. Drupal returns the full result set once; everything below
         this line happens in the browser. -->
    <div
      class="d-flex align-items-center flex-wrap py-3 mb-4"
      style="background: #faf4ea; border-top: 1px solid #e6ddcd; border-bottom: 1px solid #e6ddcd; gap: 1.625rem; padding-left: 1rem; padding-right: 1rem"
    >
      <b-form-input
        v-model="query"
        class="masthead__search"
        debounce="120"
        placeholder="Filter by ingredient"
        style="max-width: 230px"
        type="search"
      />

      <div class="d-flex align-items-center" style="gap: 0.5625rem">
        <span class="stat-grid__label">Difficulty</span>
        <b-button
          v-for="option of difficulties"
          :key="option"
          :pressed="difficulty === option"
          size="sm"
          style="border-radius: 999px; padding: 0.375rem 0.875rem"
          :variant="difficulty === option ? 'primary' : 'outline-secondary'"
          @click="difficulty = difficulty === option ? null : option"
        >
          {{ option }}
        </b-button>
      </div>

      <div class="d-flex align-items-center" style="gap: 0.5625rem">
        <span class="stat-grid__label">Sort</span>
        <b-form-select v-model="sort" :options="sortOptions" size="sm" style="width: auto" />
      </div>

      <span
        class="ml-auto"
        style="font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem; color: #0678be"
      >
        {{ filtered.length }} of {{ results.length }} · filtered client-side
      </span>
    </div>

    <b-row>
      <b-col
        v-for="result of filtered"
        :key="result.id"
        class="mb-4"
        cols="12"
        lg="3"
        sm="6"
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

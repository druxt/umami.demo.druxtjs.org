<template>
  <!-- The front page's banners, one at a time. Each slide is the banner block
       as it renders anywhere else. The bars and arrows sit on a layer of
       their own above the slides, so they stay put while the slides change. -->
  <section
    class="carousel"
    role="region"
    aria-roledescription="carousel"
    :aria-label="$t('carousel.label')"
    @keydown.left="prev"
    @keydown.right="next"
    @touchstart.passive="touchStart"
    @touchend="touchEnd"
  >
    <div class="carousel__track" aria-live="polite" aria-atomic="false">
      <div
        v-for="(result, i) of results"
        :key="result.id"
        class="carousel__slide"
        :class="{ 'carousel__slide--on': i === active }"
        role="group"
        :aria-roledescription="$t('carousel.slideRole')"
        :aria-label="
          $t('carousel.position', { n: i + 1, count: results.length })
        "
        :aria-hidden="i === active ? null : 'true'"
        :inert="i === active ? null : ''"
      >
        <DruxtEntity
          :type="result.type"
          :uuid="result.id"
          :kicker="kickers[i] || null"
        />
      </div>
    </div>

    <div v-if="titles.length > 1" class="carousel__controls">
      <b-container class="carousel__frame">
        <div
          class="carousel__bars"
          role="group"
          :aria-label="$t('carousel.slides')"
        >
          <button
            v-for="(title, i) of titles"
            :key="i"
            type="button"
            class="carousel__bar"
            :class="{ 'carousel__bar--on': i === active }"
            :aria-label="$t('carousel.slide', { n: i + 1, title })"
            :aria-current="i === active ? 'true' : null"
            @click="go(i)"
          >
            <span />
          </button>
        </div>

        <div class="carousel__nav">
          <button
            type="button"
            class="carousel__arrow"
            :aria-label="$t('carousel.previous')"
            @click="prev"
          >
            &#8592;
          </button>
          <button
            type="button"
            class="carousel__arrow"
            :aria-label="$t('carousel.next')"
            @click="next"
          >
            &#8594;
          </button>
          <span class="carousel__count" aria-hidden="true">{{ count }}</span>
        </div>
      </b-container>
    </div>
  </section>
</template>

<script>
import { DrupalJsonApiParams } from 'drupal-jsonapi-params'
import { DruxtViewsViewMixin } from 'druxt-views'
import { langMixin } from '~/utils/lang'

// A swipe shorter than this is a tap or a scroll.
const SWIPE = 40

export default {
  mixins: [langMixin, DruxtViewsViewMixin],

  data: () => ({
    active: 0,
    kickers: [],
    titles: [],
    touchX: null,
  }),

  // Each slide's kicker: the game is new, the first recipe is the recipe of
  // the week, and a later recipe names its category.
  async fetch() {
    // The view lists each banner's type and id; the store holds its fields.
    const slides = await Promise.all(
      (this.results || []).map(async ({ type, id }) => {
        const resource = await this.$store.dispatch('druxt/getResource', {
          type,
          id,
          prefix: this.prefix,
        })
        return ((resource || {}).data || {}).attributes || {}
      })
    )
    this.titles = slides.map((s) => s.field_title)

    let recipes = 0
    this.kickers = await Promise.all(
      slides.map(async (slide) => {
        const path = ((slide.field_content_link || {}).uri || '').replace(
          /^internal:/,
          ''
        )
        if (/\/play$/.test(path)) return this.$t('home.newOnUmami')
        if (recipes++ === 0) return this.$t('home.recipeOfWeek')
        return (await this.category(path)) || this.$t('home.recipeOfWeek')
      })
    )
  },

  computed: {
    count() {
      const pad = (n) => String(n).padStart(2, '0')
      return `${pad(this.active + 1)} / ${pad(this.titles.length)}`
    },
  },

  watch: {
    results() {
      this.active = 0
      this.$fetch()
    },
  },

  methods: {
    async category(path) {
      const route = await this.$store.dispatch('druxtRouter/getRoute', path)
      const { type, uuid } = (route || {}).props || {}
      if (!uuid) return null
      const resource = await this.$store.dispatch('druxt/getResource', {
        type,
        id: uuid,
        prefix: this.prefix,
        query: new DrupalJsonApiParams()
          .addInclude(['field_recipe_category'])
          .addFields(type, ['field_recipe_category'])
          .addFields('taxonomy_term--recipe_category', ['name']),
      })
      const term = (resource.included || [])[0]
      return term ? term.attributes.name : null
    },

    go(i) {
      const n = this.titles.length || 1
      this.active = (i + n) % n
    },

    next() {
      this.go(this.active + 1)
    },

    prev() {
      this.go(this.active - 1)
    },

    touchStart(event) {
      this.touchX = event.changedTouches[0].clientX
    },

    touchEnd(event) {
      if (this.touchX === null) return
      const dx = event.changedTouches[0].clientX - this.touchX
      this.touchX = null
      if (dx <= -SWIPE) this.next()
      if (dx >= SWIPE) this.prev()
    },
  },
}
</script>

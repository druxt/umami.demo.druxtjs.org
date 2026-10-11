<template>
  <div class="error-page">
    <b-container>
      <span class="error-page__kicker">{{ kicker }}</span>
      <h1 class="error-page__title">{{ title }}</h1>
      <p class="error-page__text">{{ text }}</p>
      <p v-if="resetting" class="error-page__status" role="status">
        {{ $t('error.retrying', { n: tries }) }}
      </p>
      <p v-else-if="error.message" class="error-page__detail">
        {{ error.message }}
      </p>
      <nuxt-link class="error-page__home" :to="prefix">{{
        $t('error.home')
      }}</nuxt-link>
    </b-container>
  </div>
</template>

<script>
import { langMixin } from '~/utils/lang'

/** How often the page asks Drupal whether it is back, in milliseconds. */
const RETRY = 5000

/**
 * The error page. A 503 from Drupal means the demo is reinstalling: on a
 * deploy, and on every press of the reset control. The page says so and
 * asks again until Drupal answers, then loads the page the visitor wanted.
 * Anything else is an ordinary error page with a way home.
 */
export default {
  mixins: [langMixin],

  props: {
    error: { type: Object, default: () => ({}) },
  },

  data: () => ({ tries: 0, timer: null }),

  computed: {
    status: ({ error }) => Number(error.statusCode) || 500,
    resetting: ({ status }) => status === 503,
    notFound: ({ status }) => status === 404,
    kicker() {
      return this.resetting
        ? this.$t('error.resettingKicker')
        : this.notFound
        ? this.$t('error.notFoundKicker')
        : this.$t('error.kicker')
    },
    title() {
      return this.resetting
        ? this.$t('error.resetting')
        : this.notFound
        ? this.$t('error.notFound')
        : this.$t('error.title', { status: this.status })
    },
    text() {
      return this.resetting
        ? this.$t('error.resettingText')
        : this.notFound
        ? this.$t('error.notFoundText')
        : this.$t('error.text')
    },
  },

  mounted() {
    if (this.resetting) this.timer = setInterval(this.check, RETRY)
  },

  beforeDestroy() {
    clearInterval(this.timer)
  },

  methods: {
    /** Back when Drupal's JSON:API index answers; then the page is retried. */
    async check() {
      this.tries += 1
      try {
        const response = await fetch(`${this.prefix}/jsonapi`, {
          headers: { Accept: 'application/vnd.api+json' },
        })
        if (response.ok) window.location.reload()
      } catch (e) {
        // Still away. The next tick asks again.
      }
    },
  },
}
</script>

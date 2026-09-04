<template>
  <b-row class="druxt-note" no-gutters>
    <b-col cols="12" :lg="code ? 7 : 12">
      <span class="druxt-note__kicker">{{ kicker }}</span>
      <h3 class="druxt-note__title">{{ title }}</h3>
      <p class="druxt-note__body"><slot /></p>
      <nuxt-link v-if="to" class="druxt-note__link d-inline-block mt-2" :to="to">
        {{ cta }} →
      </nuxt-link>
      <a
        v-else-if="href"
        class="druxt-note__link d-inline-block mt-2"
        :href="href"
        rel="noopener"
        target="_blank"
      >
        {{ cta }} →
      </a>
    </b-col>

    <b-col v-if="code" cols="12" lg="5" class="pl-lg-4 mt-3 mt-lg-0">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <pre class="druxt-code mb-0" v-html="code" />
    </b-col>
  </b-row>
</template>

<script>
/**
 * Inline "How this page works" card.
 *
 * One per page, placed between content sections — the only place in the
 * editorial flow where Druxt blue is allowed. `code` takes pre-highlighted
 * markup using the .t / .a / .v spans from assets/scss/theme.scss.
 */
export default {
  props: {
    kicker: {
      type: String,
      default: 'How this page works',
    },

    title: {
      type: String,
      required: true,
    },

    code: {
      type: String,
      default: '',
    },

    cta: {
      type: String,
      default: 'Read the guide',
    },

    to: {
      type: String,
      default: '',
    },

    href: {
      type: String,
      default: '',
    },
  },
}
</script>

<template>
  <!-- The code sample keeps its own width and the prose wraps around what is
       left: a fixed split squeezed the sample inside a narrow measure. -->
  <b-row class="druxt-note" no-gutters>
    <b-col cols="12" :lg="code ? true : 12">
      <span class="druxt-note__kicker">{{ kicker }}</span>
      <h3 v-if="title" class="druxt-note__title">{{ title }}</h3>
      <p class="druxt-note__body"><slot /></p>
      <!-- The component that renders the screen, so a reader can go and look
           at it. Named on every screen in the design. -->
      <code v-if="file" class="druxt-note__file d-block mt-2">{{ file }}</code>
      <nuxt-link
        v-if="to"
        class="druxt-note__link d-inline-block mt-2"
        :to="to"
      >
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

    <b-col v-if="code" cols="12" lg="auto" class="pl-lg-4 mt-3 mt-lg-0">
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
      default: '',
    },

    /** Repo-relative path of the component this note is describing. */
    file: {
      type: String,
      default: '',
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

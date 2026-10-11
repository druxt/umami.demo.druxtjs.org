<template>
  <!-- Two thirds prose, one third sample, and the sample stands as tall as
       the card so the row reads as one piece. The split follows the note's
       own width (a container query), so a note in a narrow column stacks. -->
  <div class="druxt-note" :class="{ 'druxt-note--code': code }">
    <div class="druxt-note__prose">
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
    </div>

    <div v-if="code" class="druxt-note__sample d-flex">
      <!-- One child, so the block can centre the sample without laying its
           spans out one per line. -->
      <pre class="druxt-code druxt-code--fill mb-0">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <code v-html="code" /></pre>
    </div>
  </div>
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

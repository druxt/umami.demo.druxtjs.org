<template>
  <div class="section-head">
    <div>
      <h2 class="section-head__title">{{ title }}</h2>
      <p v-if="lede" class="section-head__lede">{{ lede }}</p>
    </div>

    <nuxt-link v-if="to" class="section-head__cta" :to="to">
      {{ cta }} <span aria-hidden="true">→</span>
    </nuxt-link>
  </div>
</template>

<script>
/**
 * A band's heading: title, one line of lede, and a link to the full listing.
 */
export default {
  props: {
    title: {
      type: String,
      required: true,
    },

    lede: {
      type: String,
      default: '',
    },

    cta: {
      type: String,
      default: 'See all',
    },

    to: {
      type: String,
      default: '',
    },
  },
}
</script>

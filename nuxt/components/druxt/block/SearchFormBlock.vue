<template>
  <b-form class="ml-auto" @submit="onSubmit">
    <b-input-group>
      <b-input v-model="query" />

      <b-input-group-append>
        <b-button :disabled="!query.length" nuxt :to="to">{{
          $t('nav.search')
        }}</b-button>
      </b-input-group-append>
    </b-input-group>
  </b-form>
</template>

<script>
import { DruxtBlocksBlockMixin } from 'druxt-blocks'
import { DruxtSearchMixin } from 'druxt-search'
import { langMixin } from '~/utils/lang'

export default {
  mixins: [langMixin, DruxtBlocksBlockMixin, DruxtSearchMixin],

  computed: {
    searchOptions: () => ({
      limit: 3,
    }),

    to() {
      return { path: `${this.prefix}/search?query=${this.query}` }
    },
  },

  methods: {
    onSubmit(e) {
      e.preventDefault()

      this.$router.push(this.to)
    },
  },
}
</script>

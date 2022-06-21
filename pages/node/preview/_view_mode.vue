<template>
  <div class="druxt-node-preview">
    <ClientOnly v-if="!$fetchState.pending">
      <DruxtEntity v-model="entity" v-bind="props" />
    </ClientOnly>
  </div>
</template>

<script>
export default {
  layout: 'preview',

  data: () => ({
    entity: {},
    response: null,
  }),

  // Only fetch on client side so that the client session is used.
  fetchOnServer: false,

  // Fetch the node preview.
  async fetch() {
    try {
      const { data } = await this.$druxt.axios.get(
        this.url,
        { withCredentials: true }
      )
      this.entity = (data || {}).data
      this.response = data
    } catch(err) {
      this.response = err.response
    }
  },

  computed: {
    /**
     * The DruxtEntity props.
     *
     * @type {object}
     */
    props: ({ $route, url }) => {
      const parts = url.split('/')
      return {
        mode: $route.params.view_mode,
        type: [parts[parts.length - 4], parts[parts.length - 3]].join('--')
      }
    },

    /**
     * The JSON:API Node Preview URL.
     */
    url: ({ $route }) => $route.hash.substring(1).replace(':/', '://')
  }
}
</script>

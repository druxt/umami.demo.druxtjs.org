<template>
  <div class="druxt-node-preview">
    <ClientOnly v-if="!$fetchState.pending">
      <DruxtEntity v-if="entity" v-model="entity" v-bind="props" />
      <DruxtDebug v-else summary="An error has occured while access the preview data from your Drupal backend.">
        <a :href="url" target="_blank" v-text="url" />
        <b-textarea v-model="model" />
      </DruxtDebug>
    </ClientOnly>
  </div>
</template>

<script>
export default {
  layout: 'preview',

  data: () => ({
    entity: false,
    response: null,
    model: undefined,
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
  },

  watch: {
    model() {
      try {
        const data = JSON.parse(this.model)
        this.entity = (data || {}).data
        this.response = data
      } catch(err) {}
    }
  }
}
</script>

<template>
  <p class="druxt-ice-status">
    <span data-testid="status">{{ status }}</span>
    <span v-if="url" data-testid="url">{{ url }}</span>
    <span v-if="error" data-testid="error">{{ error }}</span>
  </p>
</template>

<script>

/**
 * The connection state, as text.
 *
 * `$druxtIce` is injected on the client only, so every read guards for it.
 * The server renders `idle` with no URL and no error. The first render in
 * the browser must produce the same markup, or hydration pairs the wrong
 * nodes and the generated build throws when a hidden span appears. So the
 * live state is read only once the component has mounted and set `hydrated`.
 */
export default {
  name: 'DruxtIceStatus',

  data() {
    return { hydrated: false }
  },

  computed: {
    ice() {
      return this.hydrated ? this.$druxtIce || null : null
    },

    status() {
      return this.ice ? this.ice.state.status : 'idle'
    },

    url() {
      return this.ice ? this.ice.state.url : null
    },

    error() {
      return this.ice ? this.ice.state.error : null
    },
  },

  mounted() {
    this.hydrated = true
  },
}
</script>

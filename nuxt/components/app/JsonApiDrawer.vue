<template>
  <div class="jsonapi-drawer">
    <button
      v-b-toggle="id"
      class="jsonapi-drawer__toggle"
      type="button"
      @click="load"
    >
      {{ $t('note.jsonapiToggle') }}
      <span aria-hidden="true">⌄</span>
    </button>

    <b-collapse :id="id">
      <div class="jsonapi-drawer__body">
        <pre class="druxt-code mb-2"><span class="a">GET</span> {{ path }}</pre>

        <!-- The response, folded to its top two levels so the shape reads
             first and any branch opens on a click. -->
        <div v-if="response" class="jsonapi-drawer__tree">
          <VueJsonPretty :data="response" :deep="2" show-length />
        </div>
        <p v-else-if="error" class="jsonapi-drawer__hint">{{ error }}</p>
        <p v-else-if="loading" class="jsonapi-drawer__hint">
          {{ $t('note.loading') }}
        </p>

        <div class="d-flex align-items-center flex-wrap" style="gap: 1rem">
          <a
            class="druxt-note__link"
            :href="url"
            rel="noopener"
            target="_blank"
            >{{ $t('note.jsonapiRaw') }}</a
          >
          <span class="jsonapi-drawer__hint">{{ $t('note.jsonapiHint') }}</span>
        </div>
      </div>
    </b-collapse>
  </div>
</template>

<script>
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

export default {
  components: { VueJsonPretty },

  props: {
    /** JSON:API path, e.g. `/en/jsonapi/node/recipe/<uuid>?…`. */
    path: {
      type: String,
      required: true,
    },
  },

  data: () => ({
    response: null,
    loading: false,
    error: '',
  }),

  computed: {
    // Hash the whole path rather than truncating it. Recipe drawers share a
    // long query suffix, so slicing the tail dropped the uuid and two recipes
    // could produce the same id; bootstrap-vue then toggles every collapse
    // with that id at once.
    id: ({ path }) => {
      let h = 0
      for (let i = 0; i < path.length; i++) {
        h = (Math.imul(31, h) + path.charCodeAt(i)) | 0
      }
      return `jsonapi-${(h >>> 0).toString(36)}`
    },

    url: ({ $config, path }) => $config.baseUrl + path,
  },

  watch: {
    // A reused drawer starts again for the new path.
    path() {
      this.response = null
      this.loading = false
      this.error = ''
    },
  },

  methods: {
    /** Fetched once, on the first open, through the same proxy the page uses. */
    async load() {
      if (this.response || this.loading) return
      const path = this.path
      this.loading = true
      try {
        const { data } = await this.$druxt.axios.get(path, {
          headers: { Accept: 'application/vnd.api+json' },
        })
        if (path === this.path) this.response = data
      } catch (e) {
        if (path === this.path) this.error = this.$t('note.jsonapiError')
      } finally {
        if (path === this.path) this.loading = false
      }
    },
  },
}
</script>

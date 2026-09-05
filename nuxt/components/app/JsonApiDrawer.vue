<template>
  <div style="border: 1px solid #e6ddcd; border-radius: 8px; overflow: hidden">
    <button
      v-b-toggle="id"
      class="d-flex align-items-center justify-content-between w-100 text-left"
      style="
        background: #faf4ea;
        border: 0;
        padding: 0.875rem 1.125rem;
        font-size: 0.8438rem;
        font-weight: 600;
        color: #55504a;
      "
      type="button"
    >
      View the JSON:API request
      <span style="color: #a2988a">⌄</span>
    </button>

    <b-collapse :id="id">
      <div class="p-3">
        <pre class="druxt-code mb-2"><span class="a">GET</span> {{ path }}</pre>
        <div class="d-flex align-items-center" style="gap: 1rem">
          <a
            class="druxt-note__link"
            :href="url"
            rel="noopener"
            target="_blank"
          >
            Open the raw response →
          </a>
          <span style="font-size: 0.75rem; color: #8a7f70">
            Every field on this page came from this one request.
          </span>
        </div>
      </div>
    </b-collapse>
  </div>
</template>

<script>
export default {
  props: {
    /** JSON:API path, e.g. `/en/jsonapi/node/recipe/<uuid>?…`. */
    path: {
      type: String,
      required: true,
    },
  },

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
}
</script>

<template>
  <b-modal
    :id="id"
    body-class="media-browser__body"
    centered
    content-class="media-browser"
    hide-header
    hide-footer
    scrollable
    size="lg"
    @shown="onShown"
    @hidden="reset"
  >
    <div class="media-browser__head">
      <span class="media-browser__title">Choose a photograph</span>
      <button
        aria-label="Close"
        class="media-browser__close"
        type="button"
        @click="$bvModal.hide(id)"
      >
        ×
      </button>
    </div>

    <input
      ref="search"
      v-model="query"
      aria-label="Search the library"
      autocomplete="off"
      class="edit-control media-browser__search"
      placeholder="Search the library"
      type="search"
      @input="search"
    />

    <p v-if="error" class="edit-field__error">{{ error }}</p>
    <p v-else-if="!items.length && !loading" class="edit-field__description">
      Nothing in the library matches.
    </p>

    <!-- The library as 4:3 tiles; one tap selects, a second confirms. -->
    <div class="media-browser__grid" role="listbox" aria-label="Library">
      <button
        v-for="item of items"
        :key="item.id"
        :aria-selected="String(selected === item.id)"
        class="media-browser__item"
        :class="{ 'is-selected': selected === item.id }"
        role="option"
        type="button"
        @click="selected = item.id"
        @dblclick="choose(item)"
      >
        <span class="media-browser__thumb">
          <img v-if="item.src" :alt="item.alt" loading="lazy" :src="item.src" />
        </span>
        <span class="media-browser__name">{{ item.name }}</span>
      </button>
    </div>

    <p v-if="loading" class="edit-field__description">Loading…</p>
    <button
      v-else-if="more"
      class="edit-list__add"
      type="button"
      @click="load(items.length)"
    >
      + Show more
    </button>

    <div class="media-browser__actions">
      <b-button
        class="edit-actions__save"
        :disabled="!selected"
        variant="primary"
        @click="choose(items.find((o) => o.id === selected))"
      >
        Use this photograph
      </b-button>
      <b-button
        class="edit-actions__cancel"
        variant="outline-secondary"
        @click="$bvModal.hide(id)"
      >
        Cancel
      </b-button>
    </div>
  </b-modal>
</template>

<script>
const PAGE = 24

/**
 * The media library as a browser: the image media, newest first, searched by
 * name over JSON:API. Emits `select` with the chosen media's type and id.
 */
export default {
  props: {
    id: { type: String, required: true },
    /** The media resource type to browse, e.g. `media--image`. */
    type: { type: String, default: 'media--image' },
  },

  data: () => ({
    query: '',
    items: [],
    selected: null,
    loading: false,
    more: false,
    error: '',
  }),

  methods: {
    onShown() {
      if (!this.items.length) this.load()
      this.$nextTick(() => this.$refs.search && this.$refs.search.focus())
    },

    reset() {
      this.selected = null
    },

    search() {
      clearTimeout(this.timer)
      this.timer = setTimeout(() => this.load(), 250)
    },

    /** One page of the library, appended when `offset` is given. */
    async load(offset = 0) {
      this.loading = true
      this.error = ''
      const [entity, bundle] = this.type.split('--')
      const q = this.query.trim()
      const params = new URLSearchParams({
        include: 'thumbnail',
        [`fields[${this.type}]`]: 'name,thumbnail',
        'fields[file--file]': 'uri',
        sort: '-changed',
        'page[limit]': String(PAGE),
        'page[offset]': String(offset),
      })
      if (q) {
        params.set('filter[name][operator]', 'CONTAINS')
        params.set('filter[name][value]', q)
      }
      try {
        const response = await this.$druxt.axios.get(
          `/en/jsonapi/${entity}/${bundle}?${params}`,
          { headers: { Accept: 'application/vnd.api+json' } }
        )
        if (this.query.trim() !== q) return
        const doc = response.data || {}
        const files = Object.fromEntries(
          (doc.included || []).map((o) => [o.id, o.attributes.uri.url])
        )
        const page = (doc.data || []).map((o) => {
          const thumb = ((o.relationships || {}).thumbnail || {}).data || {}
          return {
            id: o.id,
            type: o.type,
            name: o.attributes.name,
            alt: (thumb.meta || {}).alt || '',
            src: files[thumb.id] ? this.$config.baseUrl + files[thumb.id] : '',
          }
        })
        this.items = offset ? [...this.items, ...page] : page
        this.more = !!((doc.links || {}).next || {}).href
      } catch (e) {
        this.error = 'The library could not be read.'
      }
      this.loading = false
    },

    choose(item) {
      if (!item) return
      this.$emit('select', { type: item.type, id: item.id })
      this.$bvModal.hide(this.id)
    },
  },
}
</script>

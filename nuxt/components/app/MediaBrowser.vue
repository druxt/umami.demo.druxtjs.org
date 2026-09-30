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
      <span class="media-browser__title">{{ $t('browser.title') }}</span>
      <button
        :aria-label="$t('browser.close')"
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
      :aria-label="$t('browser.search')"
      autocomplete="off"
      class="edit-control media-browser__search"
      :placeholder="$t('browser.search')"
      type="search"
      @input="search"
    />

    <p v-if="error" class="edit-field__error">{{ error }}</p>
    <p v-else-if="!items.length && !loading" class="edit-field__description">
      {{ $t('browser.empty') }}
    </p>

    <!-- The library as 4:3 tiles; one tap selects, a second confirms. -->
    <div
      class="media-browser__grid"
      role="listbox"
      :aria-label="$t('form.library')"
    >
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

    <p v-if="loading" class="edit-field__description">
      {{ $t('note.loading') }}
    </p>
    <button
      v-else-if="more"
      class="edit-list__add"
      type="button"
      @click="load(page + 1)"
    >
      {{ $t('browser.more') }}
    </button>

    <div class="media-browser__actions">
      <b-button
        class="edit-actions__save"
        :disabled="!selected"
        variant="primary"
        @click="choose(items.find((o) => o.id === selected))"
        >{{ $t('browser.use') }}</b-button
      >
      <b-button
        class="edit-actions__cancel"
        variant="outline-secondary"
        @click="$bvModal.hide(id)"
        >{{ $t('form.cancel') }}</b-button
      >
    </div>
  </b-modal>
</template>

<script>
import { langMixin } from '~/utils/lang'

/**
 * The media library as a browser: the image media, newest first, searched by
 * name over JSON:API. Emits `select` with the chosen media's type and id.
 */
export default {
  mixins: [langMixin],

  props: {
    id: { type: String, required: true },
    /** The media resource type to browse, e.g. `media--image`. */
    type: { type: String, default: 'media--image' },
  },

  data: () => ({
    query: '',
    items: [],
    page: 0,
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
    /**
     * A page of the library, from Drupal's own media library View: the
     * `widget` display of `media_library`, the one Drupal's media library
     * dialog uses. Its exposed name filter, media type argument, published
     * filter, newest-first sort and 24-a-page pager are the View's, read
     * through JSON:API Views by the Druxt client.
     */
    async load(page = 0) {
      this.loading = true
      this.error = ''
      const bundle = this.type.split('--')[1]
      const q = this.query.trim()
      const params = new URLSearchParams({
        'views-argument[0]': bundle,
        include: 'thumbnail',
        [`fields[${this.type}]`]: 'name,thumbnail',
        'fields[file--file]': 'uri',
      })
      if (q) params.set('views-filter[name]', q)
      if (page) params.set('page', String(page))
      try {
        const doc = await this.$druxt.getResource(
          'views--media_library',
          'widget',
          params.toString(),
          this.lang
        )
        if (this.query.trim() !== q) return
        const files = Object.fromEntries(
          (doc.included || []).map((o) => [o.id, o.attributes.uri.url])
        )
        const items = (doc.data || []).map((o) => {
          const thumb = ((o.relationships || {}).thumbnail || {}).data || {}
          return {
            id: o.id,
            type: o.type,
            name: o.attributes.name,
            alt: (thumb.meta || {}).alt || '',
            src: files[thumb.id] ? this.$config.baseUrl + files[thumb.id] : '',
          }
        })
        this.items = page ? [...this.items, ...items] : items
        this.page = page
        // The View counts every match; the pager shows 24 of them a page.
        this.more = this.items.length < ((doc.meta || {}).count || 0)
      } catch (e) {
        this.error = this.$t('browser.error')
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

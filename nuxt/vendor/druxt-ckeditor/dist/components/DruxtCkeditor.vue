<template>
  <div class="druxt-ckeditor">
    <div v-show="ready" ref="host" class="druxt-ckeditor__host" />
    <textarea
      v-if="!ready"
      class="druxt-ckeditor__textarea"
      :value="value"
      @input="$emit('input', $event.target.value)"
    />
  </div>
</template>

<script>

/**
 * A CKEditor 5 field on Drupal's own build.
 *
 * A textarea until the editor is created, and still a textarea if it never
 * is. Losing formatting buttons is a worse editor. Losing the field is a
 * lost edit. The editor is created directly, not through
 * `@ckeditor/ckeditor5-vue2`. That adapter assigns `editor.isReadOnly`, and
 * CKEditor 5 removed the setter. So the adapter throws before it subscribes
 * to changes, and every keystroke is silently dropped.
 */
import {
  DrupalImageCompatibility,
  FALLBACK_TOOLBAR,
  captionsAreAttributes,
  configuredToolbar,
  editorFileUrls,
  editorPlugins,
  filtersFor,
  fromEditorCaptions,
  imageUploadAdapter,
  loadCkeditor,
  storedFileUrls,
  toEditorCaptions,
  usableToolbar,
} from '@druxt-contrib/ckeditor'

export default {
  name: 'DruxtCkeditor',

  props: {
    value: { type: String, default: '' },
    /** The text format this value belongs to. */
    format: { type: String, default: 'basic_html' },
    /** Where an inserted image's bytes go: `{ resourceType, field }`. */
    upload: { type: Object, default: null },
    /** The backend to upload to, when it is not the Druxt base URL. */
    backendUrl: { type: String, default: null },
    /** An explicit toolbar, which wins over every lookup. */
    toolbar: { type: Array, default: null },
    /** The filters the format runs, which wins over every lookup. */
    filters: { type: Array, default: null },
    /** How far down the page the editor treats as the top. */
    viewportOffset: { type: Number, default: 0 },
  },

  data: () => ({
    editor: null,
    /** Drupal's answer on the format's filters, or null while it has none. */
    liveFilters: null,
    /** Set by beforeDestroy(), for create() to check when it resumes. */
    gone: false,
  }),

  computed: {
    ready() {
      return Boolean(this.editor)
    },

    plugin() {
      return this.$druxtCkeditor
    },

    /** The backend for uploads and file paths: the prop, else the client's. */
    backend() {
      return this.backendUrl || this.plugin.backendUrl()
    },

    fileOptions() {
      return { ...this.plugin.options.files, backendUrl: this.backend }
    },

    /** The filters, from the prop, Drupal, or the options; null when unknown. */
    knownFilters() {
      if (Array.isArray(this.filters)) return this.filters
      if (Array.isArray(this.liveFilters)) return this.liveFilters
      const configured = this.plugin.options.filters[this.format]
      return Array.isArray(configured) ? configured : null
    },

    /**
     * Whether captions live in `data-caption`.
     *
     * Unknown means yes: a format that does not run `filter_caption` is rare,
     * and assuming the other way would store every caption an author wrote
     * into an attribute nothing reads.
     */
    captioned() {
      return captionsAreAttributes(
        { [this.format]: this.knownFilters },
        this.format
      )
    },

    /**
     * What the upload adapter needs. Never null: an image can be inserted
     * with no backend and no session, and is held until there is one.
     */
    uploadOptions() {
      return {
        backendUrl: this.backend,
        resourceType: (this.upload || {}).resourceType,
        field: (this.upload || {}).field,
        // The Druxt client's axios carries the signed-in bearer token and
        // refreshes it, once a site adds druxt-auth. Without a session the
        // request is unauthenticated and the image is held.
        request: (this.$druxt || {}).axios || null,
        hold: (file, dataUrl) => this.$emit('hold', { file, dataUrl }),
      }
    },
  },

  watch: {
    value(to) {
      // Only push into CKEditor when the change came from somewhere else;
      // setData on every keystroke would move the caret to the start.
      if (this.editor && this.outOfEditor(this.editor.getData()) !== to) {
        this.editor.setData(this.intoEditor(to))
      }
    },
  },

  async mounted() {
    let namespace
    try {
      namespace = await loadCkeditor({
        base: this.plugin.scripts(),
        packages: this.plugin.options.packages,
        timeout: this.plugin.options.timeout,
      })
    } catch (error) {
      this.$emit('error', error)
      return
    }
    const [items] = await Promise.all([this.loadToolbar(), this.loadFilters()])
    await this.create(namespace, items)
  },

  beforeDestroy() {
    this.gone = true
    if (this.editor) this.editor.destroy().catch(() => {})
  },

  methods: {
    /**
     * Drupal's stored markup, in the shape CKEditor edits.
     *
     * Two things differ, and both cost content if left alone. The file path
     * may be one this origin does not serve. And a caption lives in an
     * attribute the editor's schema does not know, so the editor would drop
     * it.
     */
    intoEditor(value) {
      const html = this.captioned ? toEditorCaptions(value || '') : value || ''
      return editorFileUrls(html, this.fileOptions)
    },

    /** And back, so what is emitted is what Drupal would have written. */
    outOfEditor(data) {
      const html = storedFileUrls(data, this.fileOptions)
      return this.captioned ? fromEditorCaptions(html) : html
    },

    /**
     * The buttons this format is configured for.
     *
     * The prop, then Drupal's `editor--editor` through the store, then the
     * module's options, then the built-in list. The store's answer is what a
     * page's `fetch()` carried into the payload, so a static page can answer
     * with no backend.
     */
    async loadToolbar() {
      if (this.toolbar) return usableToolbar(this.toolbar)
      const configured = await configuredToolbar(this.$store, this.format)
      if (configured.length) return configured
      const own = usableToolbar(this.plugin.options.toolbars[this.format])
      return own.length ? own : [...FALLBACK_TOOLBAR]
    },

    /** Ask Drupal which filters the format runs, if it will say. */
    async loadFilters() {
      if (Array.isArray(this.filters)) return
      this.liveFilters = await filtersFor(this.$store, this.format)
    },

    async create(namespace, items) {
      try {
        const editor = await namespace.editorClassic.ClassicEditor.create(
          this.$refs.host,
          {
            // Drupal's own integration defaults to the same value when a site
            // sets no commercial key. Without it the editor refuses to start.
            licenseKey: 'GPL',
            // Never group into a dropdown. A grouped button is still one
            // Drupal configured. Hiding it defeats the point of reading that
            // configuration at all.
            toolbar: { items, shouldNotGroupWhenFull: true },
            // Everything that loaded, not just what the toolbar shows. Markup
            // the schema does not know is stripped on the way in, silently.
            plugins: [
              ...editorPlugins(namespace),
              DrupalImageCompatibility,
              imageUploadAdapter(() => this.uploadOptions),
            ],
            // What appears when an image is selected. Left empty, CKEditor
            // warns and a selected image offers nothing, alt text included.
            image: { toolbar: this.plugin.options.image.toolbar },
            ui: { viewportOffset: { top: this.viewportOffset } },
            initialData: this.intoEditor(this.value),
          }
        )
        if (this.gone) {
          // Destroyed while the editor was being created. Nobody will call
          // beforeDestroy again, so tidy up here and say nothing.
          await editor.destroy().catch(() => {})
          return
        }
        editor.model.document.on('change:data', () => {
          this.$emit('input', this.outOfEditor(editor.getData()))
        })
        this.editor = editor
        this.$emit('ready', editor)
      } catch (error) {
        // A toolbar item with no plugin throws here, and so does a plugin
        // that will not load. The textarea stays.
        this.$emit('error', error)
      }
    },
  },
}
</script>

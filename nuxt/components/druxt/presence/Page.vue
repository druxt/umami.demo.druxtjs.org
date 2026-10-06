<template>
  <!-- Umami's theme for DruxtPresence on a page channel, on the tab row:
       faces and a count, a dashed ring while someone else is in the Edit
       tab, and a pill naming the field when Drupal's save arrives. The words
       carry the meaning; the faces are decoration. -->
  <div class="presence" :class="{ 'presence--compact': compact }">
    <span v-if="updated" class="presence__pill" role="status">
      <span class="presence__pill-dot" aria-hidden="true" />
      {{ $t('live.updated') }}
      <span
        v-if="changedLabel"
        class="presence__pill-field d-none d-lg-inline"
        v-text="`· ${changedLabel}`"
      />
    </span>

    <template v-else>
      <span v-if="editor" class="presence__editor">
        <span class="presence__editor-ring" aria-hidden="true">ED</span>
        <span v-text="$t('live.editing')" />
      </span>

      <span
        v-if="people.length && (!editor || wide)"
        class="presence__readers"
        @mouseenter="hover(true)"
        @mouseleave="hover(false)"
      >
        <button
          type="button"
          class="presence__faces"
          :aria-expanded="String(open)"
          :aria-label="$t('live.whoIsHere')"
          @click="toggle"
        >
          <AppGoAvatar
            v-for="(p, i) in people.slice(0, 3)"
            :key="p.id"
            :name="nameOf(p)"
            :seat="i"
            :size="wide ? 30 : 28"
            class="presence__face"
          />
          <span
            v-if="people.length > 3"
            class="presence__more"
            v-text="`+${people.length - 3}`"
          />
        </button>
        <span class="presence__count" v-text="countLabel(people, editor)" />
        <ul v-if="open" class="presence__names">
          <li v-for="(p, i) in people" :key="p.id">
            <AppGoAvatar :name="nameOf(p)" :seat="i" :size="28" />
            <span v-text="nameOf(p)" />
          </li>
        </ul>
      </span>
    </template>
  </div>
</template>

<script>
import { changedFields } from '~/utils/changed-fields'

/** How long a save's pill and wash stay, as the module's flash does. */
const FRESH = 6000

export default {
  props: {
    /** Everyone with the page open: `id`, `name`, `role`. */
    people: { type: Array, default: () => [] },
    /** This visitor's id. */
    self: { type: String, default: null },
    /** Everyone else with the editor role. */
    editors: { type: Array, default: () => [] },
    /** Whether Drupal's last change arrived just now. */
    updated: { type: Boolean, default: false },
    /** When it arrived. */
    updatedAt: { type: Number, default: 0 },
    // Declared so DruxtPresence's role never lands on the root element as
    // an attribute, where `role="reader"` is an invalid ARIA role.
    channel: { type: String, default: '' },
    role: { type: String, default: 'reader' },
  },

  data: () => ({ open: false, wide: false, changed: [], fields: {} }),

  computed: {
    editor: ({ editors }) => editors.length > 0,
    /** Beside Drupal's menu, for an editor: a number, not a sentence. */
    compact: ({ $auth }) => !!($auth && $auth.loggedIn),
    /** The page's entity, whose fields a save may change. */
    entity() {
      const route = (this.$store.state.druxtRouter || {}).route || {}
      return route.props || {}
    },
    /** The first changed field, named as Drupal labels it. */
    changedLabel() {
      const [first] = this.changed
      if (!first) return ''
      const label = this.fields[first]
      return label
        ? label.toLowerCase()
        : this.$te(`live.fields.${first}`)
        ? this.$t(`live.fields.${first}`)
        : ''
    },
  },

  watch: {
    /** A save arrived: find what changed, and wash it for a moment. */
    updatedAt() {
      const after = this.snapshot()
      this.changed = changedFields(this.before, after)
      this.before = after
      this.wash()
    },
    'entity.uuid'() {
      this.before = this.snapshot()
    },
  },

  mounted() {
    this.before = this.snapshot()
    this.media = window.matchMedia('(min-width: 992px)')
    this.wide = this.media.matches
    this.onMedia = (e) => {
      this.wide = e.matches
    }
    this.media.addEventListener('change', this.onMedia)
    this.onDocument = (e) => {
      if (
        e.type === 'keydown' ? e.key === 'Escape' : !this.$el.contains(e.target)
      )
        this.open = false
    }
    document.addEventListener('click', this.onDocument)
    document.addEventListener('keydown', this.onDocument)
  },

  beforeDestroy() {
    this.clearWash()
    if (this.media) this.media.removeEventListener('change', this.onMedia)
    document.removeEventListener('click', this.onDocument)
    document.removeEventListener('keydown', this.onDocument)
  },

  methods: {
    nameOf(p) {
      return p.id === this.self ? this.$t('live.you') : p.name
    },

    countLabel(people, editor) {
      if (this.compact && !this.wide) return String(people.length)
      if (editor) return this.$t('live.reading', { n: people.length })
      return people.length > 1
        ? this.$t('live.cooking', { n: people.length })
        : this.$t('live.justYou')
    },

    /** The names list opens on hover too, where there is a pointer. */
    hover(on) {
      this.hovering = on
      if (this.wide && window.matchMedia('(hover: hover)').matches)
        this.open = on
    },

    /** A click under a pointer that has already opened the list keeps it. */
    toggle() {
      const byHover =
        this.hovering &&
        this.wide &&
        window.matchMedia('(hover: hover)').matches
      this.open = byHover ? true : !this.open
    },

    /** The page entity's fields as the store holds them now. */
    snapshot() {
      const byId = ((this.$store.state.druxt || {}).resources || {})[
        this.entity.type
      ]
      const byPrefix = (byId || {})[this.entity.uuid] || {}
      const doc = Object.values(byPrefix).find((d) => d && d.data)
      return doc ? doc.data : null
    },

    /** The changed fields' elements get a warm wash for six seconds. */
    wash() {
      // A second save within the six seconds replaces the first one's wash.
      this.clearWash()
      const fields = {}
      const elements = []
      const visit = (vm) => {
        const id = vm.$options.name === 'DruxtField' && (vm.schema || {}).id
        if (id && this.changed.includes(id)) {
          fields[id] = ((vm.schema || {}).label || {}).text || ''
          if (vm.$el && vm.$el.nodeType === 1) elements.push(vm.$el)
        }
        vm.$children.forEach(visit)
      }
      visit(this.$root)
      for (const field of this.changed) {
        document
          .querySelectorAll(`[data-field="${CSS.escape(field)}"]`)
          .forEach((el) => elements.push(el))
      }
      this.fields = fields
      this.washed = elements
      elements.forEach((el) => el.classList.add('is-fresh'))
      this.washTimer = setTimeout(this.clearWash, FRESH)
    },

    clearWash() {
      clearTimeout(this.washTimer)
      for (const el of this.washed || []) el.classList.remove('is-fresh')
      this.washed = []
    },
  },
}
</script>

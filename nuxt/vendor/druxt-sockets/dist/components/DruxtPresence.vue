<script>

import DruxtModule from 'druxt/dist/components/DruxtModule.vue'

/** How long a change counts as just arrived, in milliseconds. */
const FLASH = 6000

/**
 * Who has a channel open, live, as a Druxt module.
 *
 * A site themes it the Druxt way: a `DruxtPresence<Kind>` component for the
 * channel's kind (`DruxtPresencePage` for `page:` channels), else
 * `DruxtPresenceDefault`. That component receives `people`, `self`,
 * `editors`, `updated`, `updatedAt`, `channel` and `role` as props, and
 * writes its own words. Without one, a plain count renders.
 */
export default {
  name: 'DruxtPresence',

  extends: DruxtModule,

  props: {
    /** The channel, `kind:key`; the current route's page by default. */
    channel: { type: String, default: '' },
    /** `editor` while this visitor edits what the channel shows. */
    role: { type: String, default: 'reader' },
  },

  data: () => ({ people: [], now: Date.now() }),

  computed: {
    channelName() {
      return this.channel || `page:${this.$route.path}`
    },
    kind() {
      return this.channelName.split(':')[0]
    },
    /** This visitor's id, to tell themselves apart from the others. */
    self() {
      return this.$sockets ? this.$sockets.state.id : null
    },
    /** Everyone else with the editor role in this channel. */
    editors() {
      return this.people.filter(
        (p) => p.role === 'editor' && p.id !== this.self
      )
    },
    /** When Drupal's last change reached this page. */
    updatedAt() {
      return this.$sockets ? this.$sockets.state.updatedAt : 0
    },
    updated() {
      return !!this.updatedAt && this.now - this.updatedAt < FLASH
    },
    /** What the theme component receives. */
    presence() {
      return {
        people: this.people,
        self: this.self,
        editors: this.editors,
        updated: this.updated,
        updatedAt: this.updatedAt,
        channel: this.channelName,
        role: this.role,
      }
    },
  },

  watch: {
    channelName(next, prev) {
      this.$sockets.leave(prev)
      this.people = []
      this.$sockets.join(next, this.role)
    },
    role(next) {
      this.$sockets.join(this.channelName, next)
    },
    updatedAt() {
      this.now = Date.now()
      clearTimeout(this.fade)
      this.fade = setTimeout(() => {
        this.now = Date.now()
      }, FLASH + 100)
    },
    // Released Druxt builds a module's props once; presence changes.
    presence: {
      deep: true,
      handler() {
        this.refreshProps()
      },
    },
  },

  mounted() {
    if (!this.$sockets) return
    this.off = this.$sockets.on('presence', ({ channel, payload }) => {
      if (channel === this.channelName) this.people = payload.people
    })
    this.$sockets.join(this.channelName, this.role)
  },

  beforeDestroy() {
    clearTimeout(this.fade)
    if (!this.$sockets) return
    this.off()
    this.$sockets.leave(this.channelName)
  },

  methods: {
    /** The theme component's props, rebuilt from the presence now. */
    refreshProps() {
      const component = this.component || {}
      if (!component.props || component.is === 'DruxtDebug') return
      const propsData = { langcode: this.lang, ...this.presence }
      const props = {}
      for (const key of Object.keys(component.props))
        props[key] = propsData[key]
      this.component = { ...component, props, propsData }
    },
  },

  druxt: {
    componentOptions: ({ kind }) => [[kind], ['default']],
    propsData: ({ presence }) => presence,
    slots(h) {
      return {
        default: () =>
          h(
            'span',
            {
              class: 'druxt-presence',
              attrs: { role: 'status', 'aria-live': 'polite' },
            },
            this.people.length ? `${this.people.length} here` : ''
          ),
      }
    },
  },
}
</script>

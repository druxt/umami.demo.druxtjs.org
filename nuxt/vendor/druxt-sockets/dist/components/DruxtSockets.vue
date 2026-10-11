<script>

import DruxtModule from 'druxt/dist/components/DruxtModule.vue'

/**
 * One channel, live, as a Druxt module.
 *
 * Subscribes to a channel of any kind, the current route's page by default,
 * and hands its theme component `channel`, `kind`, `channelKey`, `activity`,
 * `self`, `connected`, `people` (who is there), `messages` (the latest
 * payload of each message type) and `send(type, payload)`, bound to the
 * channel.
 *
 * A site themes it the Druxt way: a `DruxtSockets<Kind>` component for the
 * channel's kind (`DruxtSocketsGame` for `game:` channels), else
 * `DruxtSocketsDefault`. Without one it renders Druxt's debug output in
 * development and nothing in production.
 *
 * @example <caption>DruxtSockets</caption> @lang vue
 * <DruxtSockets :channel="`game:${code}`" />
 *
 * @example <caption>A theme component, components/druxt/sockets/Game.vue</caption> @lang vue
 * <template>
 *   <button @click="send('move', { card })">{{ messages.game.turn }}</button>
 * </template>
 *
 * <script>
 * import { DruxtSocketsMixin } from '@druxt-contrib/sockets/mixins'
 * export default {
 *   mixins: [DruxtSocketsMixin],
 * }
 *
 * @example <caption>Default slot (template injection)</caption> @lang vue
 * <DruxtSockets channel="game:AB">
 *   <template #default="{ messages, send }">
 *     <DruxtDebug :json="messages" />
 *   </template>
 * </DruxtSockets>
 */
export default {
  name: 'DruxtSockets',

  extends: DruxtModule,

  props: {
    /** The channel, `kind:key`; the current route's page by default. */
    channel: { type: String, default: '' },
    /** What this visitor is doing, such as `editing`: a hint, not a right. */
    activity: { type: String, default: '' },
  },

  data: () => ({ people: [], messages: {} }),

  computed: {
    channelName() {
      return this.channel || `page:${this.$route.path}`
    },
    kind() {
      return this.channelName.split(':')[0]
    },
    channelKey() {
      return this.channelName.slice(this.kind.length + 1)
    },
    /** This visitor's id, to tell themselves apart from the others. */
    self() {
      return this.$sockets ? this.$sockets.state.id : null
    },
    connected() {
      return !!this.$sockets && this.$sockets.state.connected
    },
    /** What the theme component receives. */
    sockets() {
      const channel = this.channelName
      return {
        channel,
        kind: this.kind,
        channelKey: this.channelKey,
        activity: this.activity,
        self: this.self,
        connected: this.connected,
        people: this.people,
        messages: this.messages,
        send: (type, payload) =>
          this.$sockets && this.$sockets.send(type, channel, payload),
      }
    },
  },

  watch: {
    channelName() {
      this.people = []
      this.messages = {}
      this.subscribe()
    },
    activity() {
      this.subscribe()
    },
    // Released Druxt builds a module's props once; the channel's data changes.
    sockets: {
      deep: true,
      handler() {
        this.refreshProps()
      },
    },
  },

  mounted() {
    this.subscribe()
    this.refreshProps()
  },

  beforeDestroy() {
    if (this.off) this.off()
  },

  methods: {
    /** Subscribe to the channel, then end any earlier subscription. */
    subscribe() {
      if (!this.$sockets) return
      const off = this.off
      this.off = this.$sockets.subscribe(this.channelName, this.receive, {
        activity: this.activity,
      })
      if (off) off()
    },

    receive({ type, payload }) {
      if (type === 'presence') this.people = payload.people
      this.messages = { ...this.messages, [type]: payload }
    },

    /** As DruxtModule's, without writing the channel data onto the theme. */
    getModulePropsData(wrapperProps) {
      const data = DruxtModule.methods.getModulePropsData.call(
        this,
        wrapperProps
      )
      for (const key of Object.keys(this.$options.druxt.propsData(this)))
        if (!(key in this.$attrs)) delete data.$attrs[key]
      // A server render writes this into the page; `mounted` adds `send` back.
      if (!this.$sockets) {
        delete data.propsData.send
        if ('send' in data.props) data.props.send = undefined
      }
      return data
    },

    /** The theme component's props, rebuilt from the channel's data now. */
    refreshProps() {
      const component = this.component || {}
      if (!component.props || component.is === 'DruxtDebug') return
      const propsData = {
        langcode: this.lang,
        ...this.$options.druxt.propsData(this),
      }
      const props = {}
      for (const key of Object.keys(component.props))
        props[key] = propsData[key]
      this.component = { ...component, props, propsData }
    },
  },

  druxt: {
    componentOptions: ({ kind }) => [[kind], ['default']],
    propsData: ({ sockets }) => sockets,
    template: {
      debug: 'messages',
      mixins: { DruxtSocketsMixin: '@druxt-contrib/sockets/mixins' },
    },
  },
}
</script>

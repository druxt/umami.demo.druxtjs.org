<script>

import DruxtSockets from './DruxtSockets.vue'

/**
 * Who has a channel open, live: a `DruxtSockets` that hands on presence only.
 *
 * Its theme component receives `channel`, `mode`, `self`, `people` and
 * `editors` (everyone else with the editor role). A site themes it the Druxt
 * way: a `DruxtPresence<Kind>` component for the channel's kind
 * (`DruxtPresencePage` for `page:` channels), else `DruxtPresenceDefault`.
 * Without one, it lists who is here in a live status region.
 *
 * @example <caption>DruxtPresence</caption> @lang vue
 * <DruxtPresence :mode="editing ? 'editor' : 'reader'" />
 *
 * @example <caption>A theme component, components/druxt/presence/Page.vue</caption> @lang vue
 * <template>
 *   <p role="status">{{ people.length }} reading, {{ editors.length }} editing</p>
 * </template>
 *
 * <script>
 * import { DruxtPresenceMixin } from '@druxt-contrib/sockets/mixins'
 * export default {
 *   mixins: [DruxtPresenceMixin],
 * }
 *
 * @example <caption>Default slot (template injection)</caption> @lang vue
 * <DruxtPresence>
 *   <template #default="{ people }">
 *     <span>{{ people.length }}</span>
 *   </template>
 * </DruxtPresence>
 */
export default {
  name: 'DruxtPresence',

  extends: DruxtSockets,

  computed: {
    /** Everyone else with the editor role in this channel. */
    editors() {
      return this.people.filter(
        (p) => p.role === 'editor' && p.id !== this.self
      )
    },
    /** What the theme component receives. */
    presence() {
      return {
        channel: this.channelName,
        mode: this.mode,
        self: this.self,
        people: this.people,
        editors: this.editors,
      }
    },
  },

  druxt: {
    componentOptions: ({ kind }) => [[kind], ['default']],
    propsData: ({ presence }) => presence,
    slots(h) {
      return {
        default: () =>
          h(
            'div',
            {
              class: 'druxt-presence',
              attrs: { role: 'status', 'aria-live': 'polite' },
            },
            this.people.length
              ? [
                  h(
                    'ul',
                    this.people.map((p) => h('li', { key: p.id }, p.name))
                  ),
                ]
              : []
          ),
      }
    },
    template: {
      debug: 'people',
      mixins: { DruxtPresenceMixin: '@druxt-contrib/sockets/mixins' },
    },
  },
}
</script>

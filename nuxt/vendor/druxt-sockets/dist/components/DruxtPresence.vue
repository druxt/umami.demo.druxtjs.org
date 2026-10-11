<script>

import DruxtSockets from './DruxtSockets.vue'

/**
 * Who has a channel open, live: a `DruxtSockets` that hands on presence only.
 *
 * Its theme component receives `channel`, `activity`, `self` and `people`,
 * each `{ id, name, signedIn, roles, activity }` as the server describes
 * them to this visitor; `roles` are Drupal's. A site themes it the Druxt
 * way: a `DruxtPresence<Kind>` component for the channel's kind
 * (`DruxtPresencePage` for `page:` channels), else `DruxtPresenceDefault`.
 * Without one, it lists the names of who is here in a live status region;
 * the module names nobody, so an unnamed person is not listed.
 *
 * @example <caption>DruxtPresence</caption> @lang vue
 * <DruxtPresence :activity="editing ? 'editing' : ''" />
 *
 * @example <caption>A theme component, components/druxt/presence/Page.vue</caption> @lang vue
 * <template>
 *   <p role="status">{{ people.filter((p) => p.activity === 'editing').length }} editing</p>
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
    /** The people who have a name to show. */
    named() {
      return this.people.filter((p) => p.name)
    },
    /** What the theme component receives. */
    presence() {
      return {
        channel: this.channelName,
        activity: this.activity,
        self: this.self,
        people: this.people,
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
            this.named.length
              ? [
                  h(
                    'ul',
                    this.named.map((p) => h('li', { key: p.id }, p.name))
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

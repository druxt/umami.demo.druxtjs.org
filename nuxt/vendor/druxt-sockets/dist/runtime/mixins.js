/**
 * The props a theme component receives, for `mixins: [...]`.
 *
 * Imported as `@druxt-contrib/sockets/mixins`: the package's main entry is the
 * Nuxt module, which brings the server with it.
 */

/**
 * The props a `DruxtSockets` theme component receives.
 *
 * @mixin
 *
 * @example @lang vue
 * <script>
 * import { DruxtSocketsMixin } from '@druxt-contrib/sockets/mixins'
 *
 * export default {
 *   mixins: [DruxtSocketsMixin],
 * }
 * </script>
 */
export const DruxtSocketsMixin = {
  props: {
    /** The channel, `kind:key`. */
    channel: { type: String, required: true },
    /** The channel's kind, before the first colon. */
    kind: { type: String, default: '' },
    /** The channel's key, after the first colon. */
    channelKey: { type: String, default: '' },
    /** What this visitor is doing, such as `editing`. */
    activity: { type: String, default: '' },
    /** This visitor's id. */
    self: { type: String, default: null },
    /** Whether the socket is open. */
    connected: { type: Boolean, default: false },
    /** Who is in the channel. */
    people: { type: Array, default: () => [] },
    /** The latest payload of each message type on the channel. */
    messages: { type: Object, default: () => ({}) },
    /** `send(type, payload)` on the channel. */
    send: { type: Function, default: () => {} },
  },
}

/**
 * The props a `DruxtPresence` theme component receives.
 *
 * @mixin
 *
 * @example @lang vue
 * <script>
 * import { DruxtPresenceMixin } from '@druxt-contrib/sockets/mixins'
 *
 * export default {
 *   mixins: [DruxtPresenceMixin],
 * }
 * </script>
 */
export const DruxtPresenceMixin = {
  props: {
    /** The channel, `kind:key`. */
    channel: { type: String, required: true },
    /** What this visitor is doing, such as `editing`. */
    activity: { type: String, default: '' },
    /** This visitor's id. */
    self: { type: String, default: null },
    /** Who is in the channel: `{ id, name, signedIn, roles, activity }`. */
    people: { type: Array, default: () => [] },
  },
}

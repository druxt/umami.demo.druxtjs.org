/**
 * `v-druxt-sockets`: a channel on an element, for markup that is not a
 * `DruxtSockets` component.
 *
 * `v-druxt-sockets="channel"` subscribes while the element is bound, dispatches
 * each of the channel's messages on the element as a `druxt-sockets:<type>`
 * event with the payload as `detail`, and sets `data-druxt-sockets-connected`
 * while the socket is open. A modifier is the activity: `.editing`.
 *
 * `v-druxt-sockets:send.<event>="channel"` sends each DOM `<event>` on the
 * element as a message of that type: a form's fields for `submit` on a form
 * (the page stays put), else the event's `detail`.
 *
 * Without `$sockets`, as in a server render, it does nothing.
 *
 * @example @lang vue
 * <section v-druxt-sockets="`game:${code}`" @druxt-sockets:game="onGame">
 *   <form v-druxt-sockets:send.submit="`game:${code}`">
 *     <input name="answer" />
 *   </form>
 * </section>
 */

const ATTR = 'data-druxt-sockets-connected'

/** Per element and argument, the end of what `bind` started. */
const ends = new WeakMap()

const end = (el, arg) => {
  const map = ends.get(el)
  if (!map || !map[arg]) return
  map[arg]()
  delete map[arg]
}

const receive = (el, channel, sockets, context, modifiers) => {
  const off = sockets.subscribe(
    channel,
    ({ type, payload }) =>
      el.dispatchEvent(
        new CustomEvent(`druxt-sockets:${type}`, { detail: payload })
      ),
    { activity: Object.keys(modifiers)[0] || '' }
  )
  const unwatch = context.$watch(
    () => sockets.state.connected,
    (connected) =>
      connected ? el.setAttribute(ATTR, '') : el.removeAttribute(ATTR),
    { immediate: true }
  )
  return () => {
    off()
    unwatch()
  }
}

const send = (el, channel, sockets, modifiers) => {
  const type = Object.keys(modifiers)[0]
  const handler = (event) => {
    let payload = event.detail || {}
    if (type === 'submit' && el instanceof HTMLFormElement) {
      event.preventDefault()
      payload = Object.fromEntries(new FormData(el))
    }
    sockets.send(type, channel, payload)
  }
  el.addEventListener(type, handler)
  return () => el.removeEventListener(type, handler)
}

const start = (el, { arg, value, modifiers }, { context }) => {
  const key = arg || 'receive'
  end(el, key)
  const sockets = context.$sockets
  if (!sockets || !value) return
  if (!ends.has(el)) ends.set(el, {})
  ends.get(el)[key] =
    arg === 'send'
      ? send(el, value, sockets, modifiers)
      : receive(el, value, sockets, context, modifiers)
}

export const directive = {
  bind: start,
  update(el, binding, node) {
    if (binding.value !== binding.oldValue) start(el, binding, node)
  },
  unbind(el, { arg }) {
    end(el, arg || 'receive')
  },
}

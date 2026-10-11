/**
 * The hub: who is connected, which channels each one is in, and the messages
 * between them. No sockets here, only `send` functions, so the hub runs under
 * a unit test the same as under a server.
 *
 * Every message is `{ type, channel, payload }`. A client joins channels,
 * named `kind:key` (`page:/en/recipes/x`, `room:ABCD`), and a handler a site
 * registers for a kind decides what its channels do. `page:` channels are
 * built in: they carry presence. State lives in one process.
 */
const crypto = require('crypto')

/** How long a dropped client's identity waits for it to come back. */
const RESUME_MS = 60 * 1000

/** Channels one client may be in at once. */
const MAX_CHANNELS = 30

/** Cooking-themed names for a visitor who is not signed in. */
const ADJECTIVES = [
  'Simmering',
  'Zesty',
  'Toasted',
  'Smoky',
  'Crispy',
  'Golden',
  'Peppery',
  'Saucy',
  'Tangy',
  'Herby',
]
const NOUNS = [
  'Saffron',
  'Basil',
  'Paprika',
  'Nutmeg',
  'Ginger',
  'Fennel',
  'Thyme',
  'Sumac',
  'Miso',
  'Clove',
]

const randomName = (rand = Math.random) =>
  `${ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)]} ${
    NOUNS[Math.floor(rand() * NOUNS.length)]
  }`

const token = () => crypto.randomBytes(16).toString('hex')

/** A channel name: a kind, a colon, and a short safe key. */
const CHANNEL = /^[a-z][a-z-]{0,30}:[\w/.%-]{1,200}$/

/**
 * Checks a message from a client. Anything else is dropped, never trusted.
 *
 * @returns {object|null} The message, or null when it is not one.
 */
function readMessage(raw) {
  if (typeof raw !== 'string' || raw.length > 8 * 1024) return null
  let message
  try {
    message = JSON.parse(raw)
  } catch (e) {
    return null
  }
  if (!message || typeof message !== 'object' || Array.isArray(message))
    return null
  const { type, channel, payload } = message
  if (
    typeof type !== 'string' ||
    !/^[a-z][a-z-]{0,30}(:[a-z-]{1,30})?$/.test(type)
  )
    return null
  if (
    channel !== undefined &&
    (typeof channel !== 'string' || !CHANNEL.test(channel))
  )
    return null
  if (
    payload !== undefined &&
    (typeof payload !== 'object' || payload === null || Array.isArray(payload))
  )
    return null
  return { type, channel, payload: payload || {} }
}

/**
 * The hub. `handlers` maps a channel kind (`room`, `game`) to an object with
 * any of `join(hub, channel, client)`, `leave(hub, channel, client)`,
 * `resume(hub, channel, client)` and
 * `message(hub, channel, client, type, payload)`. A channel of any other
 * kind than these and `page` is refused.
 */
function createHub({ handlers = {}, now = Date.now, rand = Math.random } = {}) {
  /** Live and resumable clients, by id. */
  const clients = new Map()
  /** Channel name to the ids in it. */
  const channels = new Map()

  const members = (channel) =>
    [...(channels.get(channel) || [])]
      .map((id) => clients.get(id))
      .filter(Boolean)

  const send = (client, type, channel, payload) => {
    if (client && client.send)
      client.send(JSON.stringify({ type, channel, payload }))
  }

  const broadcast = (channel, type, payload, except) => {
    for (const client of members(channel)) {
      if (client !== except) send(client, type, channel, payload)
    }
  }

  /** Who is in a channel, as others may see them. */
  const presence = (channel) => {
    const seen = new Map()
    for (const client of members(channel)) {
      if (!client.send) continue
      const role = (client.roles || {})[channel] || 'reader'
      const prior = seen.get(client.id)
      if (!prior || role === 'editor')
        seen.set(client.id, { id: client.id, name: client.name, role })
    }
    return [...seen.values()]
  }

  const announce = (channel) => {
    if (channel.startsWith('page:'))
      broadcast(channel, 'presence', { people: presence(channel) })
  }

  const kind = (channel) => channel.split(':')[0]

  const join = (client, channel, role) => {
    // A client in more channels than any page needs is refused another.
    if (!client.channels.has(channel) && client.channels.size >= MAX_CHANNELS)
      return send(client, 'error', channel, { message: 'Too many channels.' })
    if (!channels.has(channel)) channels.set(channel, new Set())
    channels.get(channel).add(client.id)
    client.channels.add(channel)
    client.roles[channel] =
      role === 'editor' && client.signedIn ? 'editor' : 'reader'
    const handler = handlers[kind(channel)]
    if (handler && handler.join) handler.join(api, channel, client)
    announce(channel)
  }

  const leave = (client, channel) => {
    const set = channels.get(channel)
    if (set) {
      set.delete(client.id)
      if (!set.size) channels.delete(channel)
    }
    client.channels.delete(channel)
    delete client.roles[channel]
    const handler = handlers[kind(channel)]
    if (handler && handler.leave) handler.leave(api, channel, client)
    announce(channel)
  }

  /** A new socket: a fresh identity, or the one its resume token names. */
  const connect = (sendFn, { resume, name, signedIn = false } = {}) => {
    let client = [...clients.values()].find(
      (c) => resume && c.resume === resume
    )
    if (client) {
      clearTimeout(client.expiry)
      client.send = sendFn
      client.signedIn = signedIn
      if (signedIn && name) client.name = name
    } else {
      client = {
        id: token().slice(0, 12),
        resume: token(),
        name: signedIn && name ? name : randomName(rand),
        signedIn,
        send: sendFn,
        channels: new Set(),
        roles: {},
      }
      clients.set(client.id, client)
    }
    send(client, 'hello', undefined, {
      id: client.id,
      name: client.name,
      resume: client.resume,
      channels: [...client.channels],
    })
    for (const channel of client.channels) {
      const handler = handlers[kind(channel)]
      if (handler && handler.resume) handler.resume(api, channel, client)
      announce(channel)
    }
    return client
  }

  /**
   * A dropped socket: the identity waits a while for a resume. A reload's
   * old socket can close after its new one has resumed, so a close only
   * detaches the socket it belongs to.
   */
  const disconnect = (client, sendFn) => {
    if (sendFn && client.send !== sendFn) return
    client.send = null
    for (const channel of client.channels) announce(channel)
    client.expiry = setTimeout(() => {
      for (const channel of [...client.channels]) leave(client, channel)
      clients.delete(client.id)
    }, RESUME_MS)
    if (client.expiry.unref) client.expiry.unref()
  }

  /** A message to every connected client, such as a content change. */
  const everyone = (type, payload) => {
    for (const client of clients.values())
      send(client, type, undefined, payload)
  }

  /** A sign-in the server has checked with Drupal: a real name, a role. */
  const identify = (client, { name, signedIn }) => {
    client.signedIn = !!signedIn
    if (signedIn && name) client.name = name
    if (!signedIn) {
      for (const channel of Object.keys(client.roles))
        client.roles[channel] = 'reader'
    }
    send(client, 'identity', undefined, {
      id: client.id,
      name: client.name,
      signedIn: client.signedIn,
    })
    for (const channel of client.channels) announce(channel)
  }

  /** One message from a client. */
  const receive = (client, raw) => {
    const message = readMessage(raw)
    if (!message)
      return send(client, 'error', undefined, {
        message: 'That message was not understood.',
      })
    const { type, channel, payload } = message
    // A channel is a page, or a kind the site registered a handler for.
    if (channel && kind(channel) !== 'page' && !handlers[kind(channel)])
      return send(client, 'error', channel, { message: 'No such channel.' })
    if (type === 'join' && channel) return join(client, channel, payload.role)
    if (type === 'leave' && channel) return leave(client, channel)
    if (type === 'ping') return send(client, 'pong', undefined, {})
    if (!channel || !client.channels.has(channel))
      return send(client, 'error', channel, {
        message: 'Join the channel first.',
      })
    const handler = handlers[kind(channel)]
    if (handler && handler.message)
      return handler.message(api, channel, client, type, payload)
    return send(client, 'error', channel, {
      message: 'That channel takes no messages.',
    })
  }

  const api = {
    clients,
    channels,
    members,
    send,
    broadcast,
    everyone,
    identify,
    presence,
    connect,
    disconnect,
    receive,
    join,
    leave,
    now,
    rand,
  }
  return api
}

module.exports = { createHub, readMessage, randomName, RESUME_MS, MAX_CHANNELS }

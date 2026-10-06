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

/** An activity: a short lowercase word, such as `editing`. */
const ACTIVITY = /^[a-z][a-z-]{0,30}$/

/** Drupal's name for an account: its username, else its display name. */
const drupalName = (user) =>
  user ? user.preferred_username || user.name || null : null

/** By default an anonymous viewer sees no signed-in name and no roles. */
const describeDefault = (person, viewer) =>
  viewer.signedIn || !person.signedIn
    ? person
    : { ...person, name: null, roles: [] }

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
 * `message(hub, channel, client, type, payload)`, and `presence: true` for
 * the hub to tell its channels who is there, as it does for `page`.
 * `retain`, `true` or a list of types, keeps the latest broadcast of each on
 * a channel for whoever joins next, until the channel empties. A channel
 * of any other kind than these and `page` is refused.
 */
function createHub({
  handlers = {},
  now = Date.now,
  rand = Math.random,
  log = () => {},
  name = drupalName,
  describe = describeDefault,
  rolesClaim = 'roles',
} = {}) {
  /** Live and resumable clients, by id. */
  const clients = new Map()
  /** Channel name to the ids in it. */
  const channels = new Map()
  /** Channel name to the latest payload of each retained type. */
  const retained = new Map()

  const members = (channel) =>
    [...(channels.get(channel) || [])]
      .map((id) => clients.get(id))
      .filter(Boolean)

  const send = (client, type, channel, payload) => {
    if (client && client.send)
      client.send(JSON.stringify({ type, channel, payload }))
  }

  /** Whether a channel's kind keeps the latest message of this type. */
  const retains = (channel, type) => {
    const retain = (handlers[kind(channel)] || {}).retain
    return retain === true || (Array.isArray(retain) && retain.includes(type))
  }

  const broadcast = (channel, type, payload, except) => {
    if (channels.has(channel) && retains(channel, type)) {
      if (!retained.has(channel)) retained.set(channel, new Map())
      retained.get(channel).set(type, payload)
    }
    for (const client of members(channel)) {
      if (client !== except) send(client, type, channel, payload)
    }
  }

  /** Who is in a channel, in full: what handlers see. */
  const presence = (channel) =>
    members(channel)
      .filter((client) => client.send)
      .map((client) => ({
        id: client.id,
        name: client.name,
        signedIn: client.signedIn,
        roles: client.roles,
        activity: client.activity[channel] || '',
      }))

  /** Pages, and the kinds whose handler sets `presence: true`. */
  const announce = (channel) => {
    const k = channel.split(':')[0]
    if (k !== 'page' && !(handlers[k] && handlers[k].presence)) return
    const people = presence(channel)
    for (const viewer of members(channel))
      send(viewer, 'presence', channel, {
        people: people.map((p) => describe(p, viewer)).filter(Boolean),
      })
  }

  const kind = (channel) => channel.split(':')[0]

  /** Run a handler's hook; a throw or a rejection is logged, not fatal. */
  const call = (name, channel, client, ...args) => {
    const handler = handlers[kind(channel)]
    if (!handler || !handler[name]) return
    const failed = (e) => {
      log(`${kind(channel)} ${name} failed: ${(e && e.message) || e}`)
      send(client, 'error', channel, { message: 'That failed.' })
    }
    try {
      const result = handler[name](api, channel, client, ...args)
      if (result && typeof result.then === 'function') result.then(null, failed)
    } catch (e) {
      failed(e)
    }
  }

  const join = (client, channel, activity) => {
    // A client in more channels than any page needs is refused another.
    if (!client.channels.has(channel) && client.channels.size >= MAX_CHANNELS)
      return send(client, 'error', channel, { message: 'Too many channels.' })
    if (!channels.has(channel)) channels.set(channel, new Set())
    channels.get(channel).add(client.id)
    client.channels.add(channel)
    client.activity[channel] =
      typeof activity === 'string' && ACTIVITY.test(activity) ? activity : ''
    call('join', channel, client)
    for (const [type, payload] of retained.get(channel) || [])
      send(client, type, channel, payload)
    announce(channel)
  }

  const leave = (client, channel) => {
    const set = channels.get(channel)
    if (set) {
      set.delete(client.id)
      if (!set.size) {
        channels.delete(channel)
        retained.delete(channel)
      }
    }
    client.channels.delete(channel)
    delete client.activity[channel]
    call('leave', channel, client)
    announce(channel)
  }

  /** A new socket: a fresh identity, or the one its resume token names. */
  const connect = (sendFn, { resume } = {}) => {
    let client = [...clients.values()].find(
      (c) => resume && c.resume === resume
    )
    if (client) {
      clearTimeout(client.expiry)
      client.send = sendFn
    } else {
      client = {
        id: token().slice(0, 12),
        resume: token(),
        user: null,
        signedIn: false,
        roles: [],
        send: sendFn,
        channels: new Set(),
        activity: {},
      }
      client.name = name(null, client)
      clients.set(client.id, client)
    }
    send(client, 'hello', undefined, {
      id: client.id,
      name: client.name,
      resume: client.resume,
      channels: [...client.channels],
    })
    for (const channel of client.channels) {
      call('resume', channel, client)
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

  /** The account Drupal says a client is, from its userinfo, or null. */
  const identify = (client, user) => {
    const roles = user && user[rolesClaim]
    client.user = user || null
    client.signedIn = !!user
    client.roles =
      Array.isArray(roles) && roles.every((r) => typeof r === 'string')
        ? roles
        : []
    client.name = name(client.user, client)
    send(client, 'identity', undefined, {
      id: client.id,
      name: client.name,
      signedIn: client.signedIn,
      roles: client.roles,
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
    if (type === 'join' && channel)
      return join(client, channel, payload.activity)
    if (type === 'leave' && channel) return leave(client, channel)
    if (type === 'ping') return send(client, 'pong', undefined, {})
    if (!channel || !client.channels.has(channel))
      return send(client, 'error', channel, {
        message: 'Join the channel first.',
      })
    const handler = handlers[kind(channel)]
    if (handler && handler.message)
      return call('message', channel, client, type, payload)
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

module.exports = { createHub, readMessage, RESUME_MS, MAX_CHANNELS }

/**
 * The hub handler for `display:` channels: an unsaved Manage display form in
 * Drupal, previewed live in the site. Drupal's form joins `display:<key>` and
 * sends each change as a draft; site pages opened with the same key join it
 * and render the display that way. Only whoever holds the key, which is long
 * and random, sees the draft. Nothing reaches Drupal's configuration.
 */

/** A preview key: long enough that nobody guesses one. */
const KEY = /^[A-Za-z0-9_-]{16,64}$/
/** A Druxt schema ID, `<entity type>--<bundle>--<mode>--view`. */
const SCHEMA_ID = /^[a-z0-9_]+--[a-z0-9_]+--[a-z0-9_]+--view$/
const FIELD = /^[a-z0-9_]{1,64}$/
const MAX_FIELDS = 100
const MAX_DRAFTS = 500
/** A draft nobody is looking at is dropped after this long. */
const IDLE_MS = 30 * 60 * 1000

/** A draft as the form sent it, checked, or null. */
function readDraft(payload) {
  const { schemaId, fields } = payload || {}
  if (!SCHEMA_ID.test(String(schemaId))) return null
  if (!Array.isArray(fields) || fields.length > MAX_FIELDS) return null
  if (!fields.every((f) => FIELD.test(String(f)))) return null
  return { schemaId, fields: [...new Set(fields)] }
}

function displayHandler({ idleMs = IDLE_MS } = {}) {
  const drafts = new Map()
  const idle = new Map()

  const fail = (hub, client, channel, message) =>
    hub.send(client, 'error', channel, { message })

  return {
    drafts,
    join(hub, channel, client) {
      if (!KEY.test(channel.slice(8)))
        return fail(hub, client, channel, 'That preview key is not valid.')
      clearTimeout(idle.get(channel))
      // A page opened after the form changed sees the draft straight away.
      if (drafts.has(channel))
        hub.send(client, 'draft', channel, drafts.get(channel))
    },
    leave(hub, channel) {
      if (hub.members(channel).length) return
      const timer = setTimeout(() => drafts.delete(channel), idleMs)
      if (timer.unref) timer.unref()
      idle.set(channel, timer)
    },
    message(hub, channel, client, type, payload) {
      if (type !== 'draft')
        return fail(hub, client, channel, 'A preview takes drafts only.')
      if (!KEY.test(channel.slice(8)))
        return fail(hub, client, channel, 'That preview key is not valid.')
      const draft = readDraft(payload)
      if (!draft) return fail(hub, client, channel, 'That draft is not valid.')
      if (!drafts.has(channel) && drafts.size >= MAX_DRAFTS)
        return fail(hub, client, channel, 'Too many previews are open.')
      drafts.set(channel, draft)
      hub.broadcast(channel, 'draft', draft, client)
    },
  }
}

module.exports = { displayHandler, readDraft }

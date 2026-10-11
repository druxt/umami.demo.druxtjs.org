/**
 * The hub handler for `display:` channels: an unsaved Manage display form in
 * Drupal, previewed live in the site. Drupal's form joins `display:<key>` and
 * sends the display as it stands, field by field: order, label, formatter
 * and the formatter's settings. This builds a Druxt schema from it and sends
 * that to site pages opened with the same key. Only whoever holds the key,
 * which is long and random, sees the draft. Nothing reaches Drupal's
 * configuration.
 */

/** A preview key: long enough that nobody guesses one. */
const KEY = /^[A-Za-z0-9_-]{16,64}$/
/** A Druxt schema ID, `<entity type>--<bundle>--<mode>--view`. */
const SCHEMA_ID = /^[a-z0-9_]+--[a-z0-9_]+--[a-z0-9_]+--view$/
const NAME = /^[a-z0-9_]{1,64}$/
const LABELS = ['above', 'inline', 'hidden', 'visually_hidden']
const MAX_FIELDS = 100
const MAX_BYTES = 32 * 1024
const MAX_DRAFTS = 500
/** Edits closer together than this build one schema, the latest. */
const SETTLE_MS = 150

const isObject = (value) =>
  !!value && typeof value === 'object' && !Array.isArray(value)

/** A field's display options as the form sent them, checked, or null. */
function readComponent(value) {
  if (!isObject(value)) return null
  const { type, label, weight, settings, third_party_settings: third } = value
  if (type !== undefined && type !== null && !NAME.test(String(type)))
    return null
  if (label !== undefined && !LABELS.includes(label)) return null
  if (!Number.isFinite(weight)) return null
  if (settings !== undefined && !isObject(settings)) return null
  if (third !== undefined && !isObject(third)) return null
  return {
    type: type || null,
    label: label || 'hidden',
    weight,
    settings: settings || {},
    third_party_settings: third || {},
  }
}

/** A draft as the form sent it, checked, or null. */
function readDraft(payload) {
  const { schemaId, content } = payload || {}
  if (!SCHEMA_ID.test(String(schemaId)) || !isObject(content)) return null
  const names = Object.keys(content)
  if (names.length > MAX_FIELDS || !names.every((n) => NAME.test(n)))
    return null
  if (JSON.stringify(content).length > MAX_BYTES) return null
  const checked = {}
  for (const name of names) {
    const component = readComponent(content[name])
    if (!component) return null
    checked[name] = component
  }
  return { schemaId, content: checked }
}

/**
 * `buildSchema(schemaId, content)` resolves to a Druxt schema, or null when
 * Drupal has no such display. The hub keeps the latest schema sent on a
 * channel, `retain`, and hands it to a page that joins later.
 */
function displayHandler({
  buildSchema,
  log = () => {},
  settleMs = SETTLE_MS,
} = {}) {
  /** Per channel: the draft waiting to build, and the latest draft's number. */
  const waiting = new Map()
  const latest = new Map()

  const fail = (hub, client, channel, message) =>
    hub.send(client, 'error', channel, { message })

  const build = async (hub, channel, client) => {
    const draft = waiting.get(channel)
    // The channel emptied while the draft waited.
    if (!draft) return
    waiting.delete(channel)
    const seq = latest.get(channel)
    try {
      const schema = await buildSchema(draft.schemaId, draft.content)
      // A later draft was sent while this one built: that one wins.
      if (latest.get(channel) !== seq) return
      if (!schema)
        return fail(hub, client, channel, 'Drupal has no such display.')
      hub.broadcast(
        channel,
        'draft',
        { schemaId: draft.schemaId, schema },
        client
      )
      // The form hears that its change is built, and how many are watching.
      hub.send(client, 'built', channel, {
        fields: schema.fields.length,
        watching: hub.members(channel).length - 1,
      })
    } catch (e) {
      log(`display preview: ${e.message}`)
      fail(hub, client, channel, 'The preview could not be built.')
    }
  }

  return {
    retain: ['draft'],
    join(hub, channel, client) {
      if (!KEY.test(channel.slice(8)))
        return fail(hub, client, channel, 'That preview key is not valid.')
    },
    leave(hub, channel) {
      if (hub.members(channel).length) return
      waiting.delete(channel)
      latest.delete(channel)
    },
    message(hub, channel, client, type, payload) {
      if (type !== 'draft')
        return fail(hub, client, channel, 'A preview takes drafts only.')
      if (!KEY.test(channel.slice(8)))
        return fail(hub, client, channel, 'That preview key is not valid.')
      const draft = readDraft(payload)
      if (!draft) return fail(hub, client, channel, 'That draft is not valid.')
      if (!latest.has(channel) && latest.size >= MAX_DRAFTS)
        return fail(hub, client, channel, 'Too many previews are open.')
      const pending = waiting.has(channel)
      waiting.set(channel, draft)
      latest.set(channel, (latest.get(channel) || 0) + 1)
      if (!pending) setTimeout(() => build(hub, channel, client), settleMs)
    },
  }
}

module.exports = { displayHandler, readDraft }

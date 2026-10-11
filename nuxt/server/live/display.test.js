const test = require('node:test')
const assert = require('node:assert')
const { displayHandler, readDraft } = require('./display')

const KEY = 'k'.repeat(20)
const CHANNEL = `display:${KEY}`
const ID = 'node--recipe--default--view'
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** A hub stand-in that keeps what is sent and broadcast. */
const fakeHub = (members = []) => {
  const sent = []
  return {
    sent,
    members: () => members,
    send: (client, type, channel, payload) =>
      sent.push({ to: client.id, type, channel, payload }),
    broadcast: (channel, type, payload, except) =>
      sent.push({ to: 'all', type, channel, payload, except: except.id }),
  }
}

/** A schema builder that names the fields it was given, in weight order. */
const fakeBuild = (schemaId, content) =>
  Promise.resolve(
    schemaId.startsWith('node--nope')
      ? null
      : {
          id: schemaId,
          fields: Object.entries(content)
            .sort(([, a], [, b]) => a.weight - b.weight)
            .map(([id, c]) => ({ id, label: { position: c.label } })),
        }
  )

const handlerFor = (options = {}) =>
  displayHandler({ buildSchema: fakeBuild, settleMs: 5, ...options })

const draft = (content, schemaId = ID) => ({ schemaId, content })

test('a draft is checked field by field', () => {
  assert.deepStrictEqual(
    readDraft(
      draft({
        field_a: { type: 'string', label: 'above', weight: 2, settings: {} },
        links: { weight: 9 },
      })
    ),
    draft({
      field_a: {
        type: 'string',
        label: 'above',
        weight: 2,
        settings: {},
        third_party_settings: {},
      },
      links: {
        type: null,
        label: 'hidden',
        weight: 9,
        settings: {},
        third_party_settings: {},
      },
    })
  )
  for (const payload of [
    null,
    draft({}, 'node--recipe--default--form'),
    draft({ '<b>': { weight: 1 } }),
    draft({ field_a: { weight: 'x' } }),
    draft({ field_a: { weight: 1, type: 'a b' } }),
    draft({ field_a: { weight: 1, label: 'sideways' } }),
    draft({ field_a: { weight: 1, settings: [] } }),
    draft({ field_a: { weight: 1, settings: { big: 'x'.repeat(40000) } } }),
  ])
    assert.strictEqual(readDraft(payload), null)
})

test('the schema built from a draft reaches everyone else on the key, and the form hears it is built', async () => {
  const handler = handlerFor()
  const hub = fakeHub([{ id: 'form' }, { id: 'page' }])
  const form = { id: 'form' }
  handler.message(
    hub,
    CHANNEL,
    form,
    'draft',
    draft({
      field_a: { label: 'above', weight: 2 },
      field_b: { label: 'inline', weight: 1 },
    })
  )
  await wait(30)
  const [sent, built] = hub.sent
  assert.strictEqual(sent.to, 'all')
  assert.strictEqual(sent.except, 'form')
  assert.deepStrictEqual(sent.payload, {
    schemaId: ID,
    schema: {
      id: ID,
      fields: [
        { id: 'field_b', label: { position: 'inline' } },
        { id: 'field_a', label: { position: 'above' } },
      ],
    },
  })
  assert.deepStrictEqual(built, {
    to: 'form',
    type: 'built',
    channel: CHANNEL,
    payload: { fields: 2, watching: 1 },
  })
  // The hub hands the latest draft to whoever joins later.
  assert.deepStrictEqual(handler.retain, ['draft'])
})

test('edits in quick succession build once, from the latest', async () => {
  let builds = 0
  const handler = handlerFor({
    buildSchema: (...args) => {
      builds++
      return fakeBuild(...args)
    },
  })
  const hub = fakeHub()
  for (const weight of [1, 2, 3])
    handler.message(
      hub,
      CHANNEL,
      { id: 'f' },
      'draft',
      draft({ field_a: { weight } })
    )
  await wait(30)
  assert.strictEqual(builds, 1)
  assert.strictEqual(hub.sent.filter((s) => s.type === 'draft').length, 1)
})

test('a slow build overtaken by a later draft is not sent', async () => {
  const handler = handlerFor({
    buildSchema: async (schemaId, content) => {
      if (content.field_slow) await wait(40)
      return fakeBuild(schemaId, content)
    },
  })
  const hub = fakeHub()
  handler.message(
    hub,
    CHANNEL,
    { id: 'f' },
    'draft',
    draft({ field_slow: { weight: 1 } })
  )
  await wait(15)
  handler.message(
    hub,
    CHANNEL,
    { id: 'f' },
    'draft',
    draft({ field_fast: { weight: 1 } })
  )
  await wait(80)
  assert.deepStrictEqual(
    hub.sent
      .filter((s) => s.type === 'draft')
      .map((s) => s.payload.schema.fields[0].id),
    ['field_fast']
  )
})

test('a failed or unknown build is reported to the form, and nothing throws', async () => {
  const logged = []
  const handler = handlerFor({
    buildSchema: () => Promise.reject(new Error('Drupal is down')),
    log: (m) => logged.push(m),
  })
  const hub = fakeHub()
  handler.message(
    hub,
    CHANNEL,
    { id: 'f' },
    'draft',
    draft({ field_a: { weight: 1 } })
  )
  await wait(30)
  assert.match(hub.sent.pop().payload.message, /could not be built/)
  assert.match(logged[0], /Drupal is down/)

  const unknown = handlerFor()
  unknown.message(
    hub,
    CHANNEL,
    { id: 'f' },
    'draft',
    draft({}, 'node--nope--default--view')
  )
  await wait(30)
  assert.match(hub.sent.pop().payload.message, /no such display/)
})

test('a short key, a bad draft or another message is refused', () => {
  const handler = handlerFor()
  const hub = fakeHub()
  const who = { id: 'x' }
  handler.join(hub, 'display:short', who)
  assert.match(hub.sent.pop().payload.message, /key/)
  handler.message(hub, 'display:short', who, 'draft', {})
  assert.match(hub.sent.pop().payload.message, /key/)
  handler.message(hub, CHANNEL, who, 'draft', { schemaId: 'x' })
  assert.match(hub.sent.pop().payload.message, /draft/)
  handler.message(hub, CHANNEL, who, 'save', {})
  assert.match(hub.sent.pop().payload.message, /drafts only/)
})

test('an emptied channel forgets a draft still waiting to build', async () => {
  let builds = 0
  const handler = handlerFor({
    buildSchema: (...args) => {
      builds++
      return fakeBuild(...args)
    },
  })
  const hub = fakeHub([])
  handler.message(
    hub,
    CHANNEL,
    { id: 'f' },
    'draft',
    draft({ field_a: { weight: 1 } })
  )
  handler.leave(hub, CHANNEL)
  await wait(30)
  assert.strictEqual(builds, 0)
  assert.strictEqual(hub.sent.length, 0)
})

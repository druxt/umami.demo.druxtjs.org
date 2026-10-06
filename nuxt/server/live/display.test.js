const test = require('node:test')
const assert = require('node:assert')
const { displayHandler, readDraft } = require('./display')

const KEY = 'k'.repeat(20)
const CHANNEL = `display:${KEY}`

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

test('a draft is checked: a schema ID and field names, nothing else', () => {
  assert.deepStrictEqual(
    readDraft({
      schemaId: 'node--recipe--default--view',
      fields: ['field_a', 'field_b', 'field_a'],
    }),
    { schemaId: 'node--recipe--default--view', fields: ['field_a', 'field_b'] }
  )
  for (const payload of [
    null,
    { schemaId: 'node--recipe--default--form', fields: [] },
    { schemaId: 'nope', fields: [] },
    { schemaId: 'node--recipe--default--view', fields: 'x' },
    { schemaId: 'node--recipe--default--view', fields: ['<script>'] },
    {
      schemaId: 'node--recipe--default--view',
      fields: Array.from({ length: 101 }, (_, i) => `f${i}`),
    },
  ])
    assert.strictEqual(readDraft(payload), null)
})

test('a draft reaches everyone else on the key, and anyone joining later', () => {
  const handler = displayHandler()
  const hub = fakeHub()
  const form = { id: 'form' }
  const draft = { schemaId: 'node--recipe--default--view', fields: ['field_b'] }
  handler.message(hub, CHANNEL, form, 'draft', draft)
  assert.deepStrictEqual(hub.sent.pop(), {
    to: 'all',
    type: 'draft',
    channel: CHANNEL,
    payload: draft,
    except: 'form',
  })
  handler.join(hub, CHANNEL, { id: 'page' })
  assert.deepStrictEqual(hub.sent.pop().payload, draft)
})

test('a short key, a bad draft or another message is refused', () => {
  const handler = displayHandler()
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
  assert.strictEqual(handler.drafts.size, 0)
})

test('a draft nobody watches is dropped', async () => {
  const handler = displayHandler({ idleMs: 20 })
  const hub = fakeHub([])
  handler.message(hub, CHANNEL, { id: 'f' }, 'draft', {
    schemaId: 'node--page--default--view',
    fields: ['field_body'],
  })
  handler.leave(hub, CHANNEL)
  await new Promise((resolve) => setTimeout(resolve, 60))
  assert.strictEqual(handler.drafts.has(CHANNEL), false)
  // Someone still on the channel keeps it.
  handler.message(hub, CHANNEL, { id: 'f' }, 'draft', {
    schemaId: 'node--page--default--view',
    fields: ['field_body'],
  })
  handler.leave(fakeHub([{ id: 'p' }]), CHANNEL)
  await new Promise((resolve) => setTimeout(resolve, 60))
  assert.strictEqual(handler.drafts.has(CHANNEL), true)
})

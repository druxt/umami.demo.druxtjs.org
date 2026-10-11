const test = require('node:test')
const assert = require('node:assert')
const { gameHandler, MAX_GAMES } = require('./game-room')

/** A hub stand-in that keeps what each client is sent. */
const fakeHub = () => {
  const sent = []
  return {
    sent,
    members: () => [],
    send: (client, type, channel, payload) =>
      sent.push({ to: client.id, type, channel, payload }),
    last: (type) => [...sent].reverse().find((m) => m.type === type),
  }
}
const create = (handler, hub, id) =>
  handler.message(hub, 'game:new', { id }, 'create', { langcode: 'en' })

test('a visitor gets one open table: asking again returns it', async () => {
  const handler = gameHandler({ rand: Math.random })
  const hub = fakeHub()
  await create(handler, hub, 'a')
  const first = hub.last('created').payload.code
  await create(handler, hub, 'a')
  assert.strictEqual(hub.last('created').payload.code, first)
  assert.strictEqual(handler.games.size, 1)
  // Someone else gets a table of their own.
  await create(handler, hub, 'b')
  assert.notStrictEqual(hub.last('created').payload.code, first)
  assert.strictEqual(handler.games.size, 2)
  // Once the first game is over, its starter may set another.
  handler.games.get(first).phase = 'over'
  await create(handler, hub, 'a')
  assert.notStrictEqual(hub.last('created').payload.code, first)
})

test('a table nobody joins closes, and one that fills stays', async () => {
  const handler = gameHandler({ rand: Math.random, unjoinedMs: 20 })
  const hub = fakeHub()
  await create(handler, hub, 'a')
  const alone = hub.last('created').payload.code
  await create(handler, hub, 'b')
  const joined = hub.last('created').payload.code
  handler.games.get(joined).players.push({ id: 'b' }, { id: 'c' })
  await new Promise((resolve) => setTimeout(resolve, 60))
  assert.strictEqual(handler.games.has(alone), false)
  assert.strictEqual(handler.games.has(joined), true)
})

test('past the open-table limit, a new table is refused', async () => {
  const handler = gameHandler({ rand: Math.random })
  const hub = fakeHub()
  for (let i = 0; i < MAX_GAMES; i++) await create(handler, hub, `c${i}`)
  await create(handler, hub, 'late')
  assert.match(hub.last('error').payload.message, /Too many games/)
})

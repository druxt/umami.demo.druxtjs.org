const test = require('node:test')
const assert = require('node:assert')
const { roomCode, CODE_CHARS } = require('./code')

test('a room code is four characters that never read as another', () => {
  const code = roomCode(new Set())
  assert.match(code, /^[A-Z2-9]{4}$/)
  for (const confusable of 'IO01') assert.ok(!CODE_CHARS.includes(confusable))
})

test('a room code is never one already taken', () => {
  let n = 0
  // The first draws repeat a taken code; the next is free.
  const rand = () => (n++ < 4 ? 0 : 0.5)
  const code = roomCode(new Set(['AAAA']), rand)
  assert.notStrictEqual(code, 'AAAA')
  assert.throws(() => roomCode(new Set(['AAAA']), () => 0), /No free room/)
})

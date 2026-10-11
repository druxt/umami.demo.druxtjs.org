const test = require('node:test')
const assert = require('node:assert')
const { name, cookingName } = require('./names')

test("a signed-in person has Drupal's name", () => {
  assert.strictEqual(
    name({ preferred_username: 'chef', name: 'x' }, { id: 'a' }),
    'chef'
  )
  assert.strictEqual(name({ name: 'cook' }, { id: 'a' }), 'cook')
})

test('a guest has a cooking name that stays the same for their socket', () => {
  const first = name(null, { id: 'abc123' })
  assert.match(first, /^[A-Z][a-z]+ [A-Z][a-z]+$/)
  assert.strictEqual(name(null, { id: 'abc123' }), first)
  const names = new Set(
    Array.from({ length: 40 }, (_, i) => cookingName(`client-${i}`))
  )
  assert.ok(names.size > 10, 'guests get different names')
})

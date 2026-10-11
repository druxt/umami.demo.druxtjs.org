const test = require('node:test')
const assert = require('node:assert')
const g = require('./game')

/** A repeatable random source, so a deal is the same every run. */
const seeded =
  (seed = 1) =>
  () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
const card = (kind, extra = {}) => ({
  id: Math.random().toString(36),
  kind,
  ...extra,
})
const recipes = [
  {
    title: 'Borscht',
    category: 'Main courses',
    difficulty: 'medium',
    servings: 8,
  },
  {
    title: 'Fiery chili',
    category: 'Starters',
    difficulty: 'easy',
    servings: 4,
  },
  { title: 'Brownies', category: 'Desserts', difficulty: 'hard', servings: 12 },
  { title: 'Nachos', category: 'Snacks', difficulty: 'easy', servings: 2 },
  {
    title: 'Slaw',
    category: 'Accompaniments',
    difficulty: 'easy',
    servings: 6,
  },
]

test('the shuffle is a permutation and the deck has every card', () => {
  const deck = g.buildDeck(recipes, seeded(7))
  const total = Object.values(g.DECK).reduce((a, b) => a + b, 0)
  assert.strictEqual(deck.length, total)
  assert.strictEqual(new Set(deck.map((c) => c.id)).size, total)
  assert.strictEqual(
    deck
      .filter((c) => c.kind === 'dessert')
      .every((c) => c.title === 'Brownies'),
    true
  )
  const shuffled = g.shuffle([1, 2, 3, 4, 5], seeded(3))
  assert.deepStrictEqual([...shuffled].sort(), [1, 2, 3, 4, 5])
})

test('a shuffle is not biased toward the original order', () => {
  // Over many shuffles each item lands first about equally often.
  const firsts = [0, 0, 0, 0]
  const rand = seeded(11)
  for (let i = 0; i < 8000; i++) firsts[g.shuffle([0, 1, 2, 3], rand)[0]]++
  for (const n of firsts) assert.ok(n > 1700 && n < 2300, `uneven: ${firsts}`)
})

test('dishes score their difficulty, and a sauce triples the next one only', () => {
  assert.strictEqual(g.tableauPoints([card('dish', { points: 2 })]), 2)
  assert.strictEqual(
    g.tableauPoints([
      card('sauce'),
      card('dish', { points: 3 }),
      card('dish', { points: 1 }),
    ]),
    10
  )
  // A sauce after the dish does nothing for it.
  assert.strictEqual(
    g.tableauPoints([card('dish', { points: 3 }), card('sauce')]),
    3
  )
})

test('starters score in pairs, feasts in threes, snacks on a curve', () => {
  assert.strictEqual(g.tableauPoints([card('starter')]), 0)
  assert.strictEqual(
    g.tableauPoints([card('starter'), card('starter'), card('starter')]),
    5
  )
  assert.strictEqual(g.tableauPoints([card('feast'), card('feast')]), 0)
  assert.strictEqual(
    g.tableauPoints([card('feast'), card('feast'), card('feast')]),
    10
  )
  const snacks = (n) => Array.from({ length: n }, () => card('snack'))
  assert.deepStrictEqual(
    [0, 1, 2, 3, 4, 5, 6].map((n) => g.tableauPoints(snacks(n))),
    [0, 1, 3, 6, 10, 15, 15]
  )
})

test('sides: most +6, second +3, ties split and a tied first takes no second', () => {
  assert.deepStrictEqual(g.sidesPoints([5, 3, 1]), [6, 3, 0])
  assert.deepStrictEqual(g.sidesPoints([4, 4, 1]), [3, 3, 0])
  assert.deepStrictEqual(g.sidesPoints([5, 2, 2]), [6, 1, 1])
  assert.deepStrictEqual(g.sidesPoints([0, 0]), [0, 0])
})

test('desserts: most +6, fewest -6, no penalty with two players', () => {
  assert.deepStrictEqual(g.dessertPoints([3, 1, 0]), [6, 0, -6])
  assert.deepStrictEqual(g.dessertPoints([2, 2, 0]), [3, 3, -6])
  assert.deepStrictEqual(g.dessertPoints([3, 0]), [6, 0])
  assert.deepStrictEqual(g.dessertPoints([1, 1, 1]), [0, 0, 0])
})

test('only the host starts, and with two players at least', () => {
  const game = g.createGame('ABCD', 'host')
  g.addPlayer(game, 'host', 'Saucy Basil')
  assert.match(g.start(game, 'host', recipes, seeded()), /Two players/)
  g.addPlayer(game, 'guest', 'Zesty Miso')
  assert.match(g.start(game, 'guest', recipes, seeded()), /host/)
  assert.strictEqual(g.start(game, 'host', recipes, seeded()), null)
  assert.strictEqual(game.players[0].hand.length, g.HAND[2])
  assert.match(g.addPlayer(game, 'late', 'Late'), /started/)
})

test('picks stay hidden until everyone has picked, then hands pass left', () => {
  const game = g.createGame('ABCD', 'a')
  for (const id of ['a', 'b', 'c']) g.addPlayer(game, id, id)
  g.start(game, 'a', recipes, seeded(5))
  const handB = game.players[1].hand.slice()
  assert.strictEqual(g.pick(game, 'a', 0), null)
  const seen = g.view(game, 'b')
  assert.strictEqual(seen.players[0].picked, true)
  assert.strictEqual(JSON.stringify(seen).includes('"pick"'), false)
  assert.strictEqual(seen.hand.length, g.HAND[3])
  assert.strictEqual(g.resolveTurn(game), false)
  g.pick(game, 'b', 2)
  g.pick(game, 'c', 1)
  assert.strictEqual(g.resolveTurn(game), true)
  // b's hand, less b's pick, is now a's.
  const expected = handB.filter((_, i) => i !== 2).map((c) => c.id)
  assert.deepStrictEqual(
    game.players[0].hand.map((c) => c.id),
    expected
  )
  assert.strictEqual(game.players[1].played[0].id, handB[2].id)
})

test('a view is a copy: changing it leaves the game alone', () => {
  const game = g.createGame('ABCD', 'a')
  g.addPlayer(game, 'a', 'a')
  g.addPlayer(game, 'b', 'b')
  g.start(game, 'a', recipes, seeded())
  const seen = g.view(game, 'a')
  seen.hand.pop()
  seen.players[0].score = 99
  assert.strictEqual(game.players[0].hand.length, g.HAND[2])
  assert.strictEqual(game.players[0].score, 0)
})

test('three rounds play out, score, and end with desserts', () => {
  const game = g.createGame('ABCD', 'a')
  g.addPlayer(game, 'a', 'a')
  g.addPlayer(game, 'b', 'b')
  const rand = seeded(9)
  g.start(game, 'a', recipes, rand)
  for (let round = 1; round <= 3; round++) {
    while (game.phase === 'picking') {
      g.pick(game, 'a', 0)
      g.pick(game, 'b', 0)
      g.resolveTurn(game)
    }
    assert.strictEqual(game.players[0].rounds.length, round)
    if (round < 3) {
      assert.strictEqual(game.phase, 'scored')
      assert.match(g.nextRound(game, 'b', recipes, rand), /host/)
      assert.strictEqual(g.nextRound(game, 'a', recipes, rand), null)
    }
  }
  assert.strictEqual(game.phase, 'over')
  for (const p of game.players) {
    const sum = p.rounds.reduce((a, b) => a + b, 0) + (p.dessertScore || 0)
    assert.strictEqual(p.score, sum)
  }
})

test('a swap played earlier takes two cards, and goes back into the hand', () => {
  const game = g.createGame('ABCD', 'a')
  g.addPlayer(game, 'a', 'a')
  g.addPlayer(game, 'b', 'b')
  g.start(game, 'a', recipes, seeded(2))
  const a = game.players[0]
  a.played = [card('swap')]
  assert.match(g.pick(game, 'b', 0, 1), /swap card first/)
  const before = a.hand.length
  assert.strictEqual(g.pick(game, 'a', 0, 1), null)
  g.pick(game, 'b', 0)
  g.resolveTurn(game)
  assert.strictEqual(a.played.filter((c) => c.kind === 'swap').length, 0)
  assert.strictEqual(a.played.length, 2)
  // a's old hand, two cards out and the swap in, went to b.
  assert.strictEqual(game.players[1].hand.length, before - 2 + 1)
  assert.ok(game.players[1].hand.some((c) => c.kind === 'swap'))
})

test('a player who has gone has their first card played for them', () => {
  const game = g.createGame('ABCD', 'a')
  g.addPlayer(game, 'a', 'a')
  g.addPlayer(game, 'b', 'b')
  g.start(game, 'a', recipes, seeded())
  g.pick(game, 'a', 1)
  g.autoPick(game, 'b')
  assert.strictEqual(g.resolveTurn(game), true)
})

test('a pick out of range or out of turn is refused', () => {
  const game = g.createGame('ABCD', 'a')
  g.addPlayer(game, 'a', 'a')
  g.addPlayer(game, 'b', 'b')
  assert.match(g.pick(game, 'a', 0), /next turn/)
  g.start(game, 'a', recipes, seeded())
  assert.match(g.pick(game, 'a', 99), /not in your hand/)
  assert.match(g.pick(game, 'a', 'x'), /not in your hand/)
  assert.match(g.pick(game, 'z', 0), /not playing/)
})

test('a view counts the turn and names who passed the hand', () => {
  const game = g.createGame('ABCD', 'a')
  for (const [id, name] of [
    ['a', 'Jo'],
    ['b', 'Alex'],
    ['c', 'Sam'],
  ])
    g.addPlayer(game, id, name)
  g.start(game, 'a', recipes, seeded(3))
  let seen = g.view(game, 'a')
  assert.deepStrictEqual([seen.turn, seen.turns], [1, g.HAND[3]])
  // Hands pass left: a's next hand comes from b, and c's from a.
  assert.strictEqual(seen.from, 'Alex')
  assert.strictEqual(g.view(game, 'c').from, 'Jo')
  for (const id of ['a', 'b', 'c']) g.pick(game, id, 0)
  g.resolveTurn(game)
  seen = g.view(game, 'a')
  assert.strictEqual(seen.turn, 2)
  assert.strictEqual(seen.maxPlayers, g.MAX_PLAYERS)
  // Someone watching has no seat, no turn and nobody passing to them.
  const watcher = g.view(game, 'nobody')
  assert.deepStrictEqual([watcher.turn, watcher.from], [0, null])
})

test('the host starts again at the same table once the game is over', () => {
  const game = g.createGame('ABCD', 'a')
  g.addPlayer(game, 'a', 'a')
  g.addPlayer(game, 'b', 'b')
  assert.match(g.restart(game, 'a'), /not over/)
  game.phase = 'over'
  game.players[0].score = 40
  game.players[0].dessertScore = 6
  assert.match(g.restart(game, 'b'), /host/)
  assert.strictEqual(g.restart(game, 'a'), null)
  assert.strictEqual(game.phase, 'lobby')
  assert.strictEqual(game.round, 0)
  assert.deepStrictEqual(
    game.players.map((p) => p.id),
    ['a', 'b']
  )
  assert.strictEqual(game.players[0].score, 0)
  assert.strictEqual('dessertScore' in game.players[0], false)
  assert.strictEqual(g.start(game, 'a', recipes, seeded()), null)
})

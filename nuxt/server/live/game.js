// cspell:ignore Entrantes Platos principales Aperitivos Tentempiés Acompañamientos Postres
/**
 * Umami Go: a drafting card game over the magazine's recipes, in the spirit
 * of Sushi Go with its own cards. Everyone picks one card from their hand at
 * once, the picks are revealed together, hands pass left, and after three
 * rounds the most points wins.
 *
 * Plain functions over plain state, with the random source passed in, so the
 * scoring and the flow run under unit tests exactly as in a room.
 */

/** How many of each card a deck holds, before the recipes give them names. */
const DECK = {
  dish: 20,
  sauce: 6,
  starter: 14,
  feast: 14,
  snack: 14,
  side: 26,
  dessert: 10,
  swap: 4,
}

/** Cards in a hand, by player count. */
const HAND = { 2: 10, 3: 9, 4: 8, 5: 7 }
const ROUNDS = 3
const MAX_PLAYERS = 5

/** Which card a recipe category makes. */
const KIND_BY_CATEGORY = {
  Starters: 'starter',
  Entrantes: 'starter',
  'Main courses': 'feast',
  'Platos principales': 'feast',
  Snacks: 'snack',
  Aperitivos: 'snack',
  Tentempiés: 'snack',
  Accompaniments: 'side',
  Acompañamientos: 'side',
  Desserts: 'dessert',
  Postres: 'dessert',
}

/** A fair shuffle: Fisher–Yates over a copy. */
function shuffle(items, rand) {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const t = out[i]
    out[i] = out[j]
    out[j] = t
  }
  return out
}

/** A dish's points from the recipe's difficulty. */
const pointsFor = (difficulty) =>
  ({ easy: 1, medium: 2, hard: 3 }[String(difficulty || '').toLowerCase()] || 1)

/** A side's icons from the servings: one to three. */
const sidesFor = (servings) => {
  const n = Number(servings) || 0
  return n >= 6 ? 3 : n >= 3 ? 2 : 1
}

/**
 * A deck from the published recipes: each kind's count filled by cycling its
 * recipes for names and pictures. A kind with no recipe of its own borrows
 * from all of them. The sauce and the swap are the game's own cards.
 */
function buildDeck(recipes, rand) {
  const byKind = {}
  for (const r of recipes) {
    const kind = KIND_BY_CATEGORY[r.category] || 'dish'
    ;(byKind[kind] = byKind[kind] || []).push(r)
  }
  const cards = []
  let n = 0
  for (const [kind, count] of Object.entries(DECK)) {
    const pool = byKind[kind] && byKind[kind].length ? byKind[kind] : recipes
    const order = shuffle(pool, rand)
    for (let i = 0; i < count; i++) {
      const r =
        kind === 'sauce' || kind === 'swap' ? null : order[i % order.length]
      const card = { id: `c${++n}`, kind }
      if (r) {
        card.title = r.title
        card.image = r.image || null
        card.path = r.path || null
      }
      if (kind === 'dish') card.points = pointsFor(r && r.difficulty)
      if (kind === 'side') card.sides = sidesFor(r && r.servings)
      cards.push(card)
    }
  }
  return shuffle(cards, rand)
}

/** Points for one player's played cards in a round, dishes and sauce included. */
function tableauPoints(played) {
  let points = 0
  let sauces = 0
  for (const card of played) {
    if (card.kind === 'sauce') sauces++
    if (card.kind === 'dish') {
      // A sauce waiting for a dish triples it.
      if (sauces > 0) {
        points += card.points * 3
        sauces--
      } else {
        points += card.points
      }
    }
  }
  const count = (kind) => played.filter((c) => c.kind === kind).length
  points += Math.floor(count('starter') / 2) * 5
  points += Math.floor(count('feast') / 3) * 10
  points += [0, 1, 3, 6, 10, 15][Math.min(count('snack'), 5)]
  return points
}

/**
 * The sides majority: most icons +6 split among ties; second +3 split, unless
 * the first was tied. Nobody scores for none.
 */
function sidesPoints(totals) {
  const out = totals.map(() => 0)
  const values = [...new Set(totals.filter((t) => t > 0))].sort((a, b) => b - a)
  if (!values.length) return out
  const first = totals
    .map((t, i) => (t === values[0] ? i : -1))
    .filter((i) => i >= 0)
  first.forEach((i) => {
    out[i] += Math.floor(6 / first.length)
  })
  if (first.length === 1 && values[1] !== undefined) {
    const second = totals
      .map((t, i) => (t === values[1] ? i : -1))
      .filter((i) => i >= 0)
    second.forEach((i) => {
      out[i] += Math.floor(3 / second.length)
    })
  }
  return out
}

/** Every player's points for a round. */
function scoreRound(playedByPlayer) {
  const base = playedByPlayer.map(tableauPoints)
  const sides = sidesPoints(
    playedByPlayer.map((p) =>
      p.filter((c) => c.kind === 'side').reduce((s, c) => s + c.sides, 0)
    )
  )
  return base.map((b, i) => b + sides[i])
}

/**
 * Desserts at the end: most +6, fewest -6, each split among ties. With two
 * players nobody loses points for the fewest. All equal scores nothing.
 */
function dessertPoints(counts) {
  const out = counts.map(() => 0)
  const most = Math.max(...counts)
  const fewest = Math.min(...counts)
  if (most === fewest) return out
  const top = counts.map((c, i) => (c === most ? i : -1)).filter((i) => i >= 0)
  top.forEach((i) => {
    out[i] += Math.floor(6 / top.length)
  })
  if (counts.length > 2) {
    const bottom = counts
      .map((c, i) => (c === fewest ? i : -1))
      .filter((i) => i >= 0)
    bottom.forEach((i) => {
      out[i] -= Math.floor(6 / bottom.length)
    })
  }
  return out
}

/** A game in its lobby. */
function createGame(code, hostId) {
  return {
    code,
    host: hostId,
    phase: 'lobby',
    round: 0,
    players: [],
    deck: [],
    log: [],
  }
}

/** A player joins the lobby. Returns an error message, or null. */
function addPlayer(game, id, name) {
  if (game.players.some((p) => p.id === id)) return null
  if (game.phase !== 'lobby')
    return 'This game has started. Wait for the next one.'
  if (game.players.length >= MAX_PLAYERS) return 'This game is full.'
  game.players.push({
    id,
    name,
    hand: [],
    played: [],
    pick: null,
    swapPick: null,
    desserts: 0,
    score: 0,
    rounds: [],
  })
  return null
}

/** Deal a round from a fresh deck of the recipes published now. */
function dealRound(game, recipes, rand) {
  game.round++
  game.deck = buildDeck(recipes, rand)
  const size = HAND[game.players.length]
  for (const p of game.players) {
    p.hand = game.deck.splice(0, size)
    p.played = []
    p.pick = null
    p.swapPick = null
  }
  game.phase = 'picking'
}

/** The host starts the game. */
function start(game, clientId, recipes, rand) {
  if (game.host !== clientId) return 'Only the host starts the game.'
  if (game.phase !== 'lobby') return 'The game has started.'
  if (game.players.length < 2) return 'Two players at least.'
  if (!recipes.length) return 'There are no recipes to deal.'
  dealRound(game, recipes, rand)
  return null
}

/**
 * A player picks a card from their hand, held hidden until everyone has. A
 * swap card already played lets them take a second card this turn.
 */
function pick(game, clientId, index, second) {
  if (game.phase !== 'picking') return 'Wait for the next turn.'
  const p = game.players.find((x) => x.id === clientId)
  if (!p) return 'You are not playing this game.'
  const i = Number(index)
  if (!Number.isInteger(i) || i < 0 || i >= p.hand.length)
    return 'That card is not in your hand.'
  if (second !== undefined) {
    const j = Number(second)
    if (!p.played.some((c) => c.kind === 'swap'))
      return 'Play a swap card first to take two.'
    if (!Number.isInteger(j) || j < 0 || j >= p.hand.length || j === i)
      return 'Pick two different cards.'
    p.swapPick = j
  } else {
    p.swapPick = null
  }
  p.pick = i
  return null
}

/** Whether every player has picked, so the turn can resolve. */
const allPicked = (game) => game.players.every((p) => p.pick !== null)

/**
 * Reveal the turn: each pick moves to its player's table (a swap goes back
 * into the hand it came from), then hands pass left. An empty hand ends the
 * round and scores it.
 */
function resolveTurn(game) {
  if (game.phase !== 'picking' || !allPicked(game)) return false
  for (const p of game.players) {
    const indices = [p.pick, p.swapPick]
      .filter((x) => x !== null)
      .sort((a, b) => b - a)
    const taken = indices.map((x) => p.hand[x])
    for (const x of indices) p.hand.splice(x, 1)
    if (taken.length === 2) {
      // The swap goes back into the hand that passes on.
      const swap = p.played.findIndex((c) => c.kind === 'swap')
      p.hand.push(p.played.splice(swap, 1)[0])
    }
    for (const card of taken.reverse()) {
      if (card.kind === 'dessert') p.desserts++
      p.played.push(card)
    }
    p.pick = null
    p.swapPick = null
  }
  const hands = game.players.map((p) => p.hand)
  game.players.forEach((p, i) => {
    p.hand = hands[(i + 1) % hands.length]
  })
  if (game.players.every((p) => p.hand.length === 0)) {
    const points = scoreRound(game.players.map((p) => p.played))
    game.players.forEach((p, i) => {
      p.rounds.push(points[i])
      p.score += points[i]
    })
    if (game.round >= ROUNDS) {
      const extra = dessertPoints(game.players.map((p) => p.desserts))
      game.players.forEach((p, i) => {
        p.score += extra[i]
        p.dessertScore = extra[i]
      })
      game.phase = 'over'
    } else {
      game.phase = 'scored'
    }
  }
  return true
}

/** The host starts again at the same table: the same players, no points. */
function restart(game, clientId) {
  if (game.host !== clientId) return 'Only the host starts again.'
  if (game.phase !== 'over') return 'The game is not over.'
  game.phase = 'lobby'
  game.round = 0
  game.deck = []
  for (const p of game.players) {
    Object.assign(p, {
      hand: [],
      played: [],
      pick: null,
      swapPick: null,
      desserts: 0,
      score: 0,
      rounds: [],
    })
    delete p.dessertScore
  }
  return null
}

/** The host deals the next round after the scores. */
function nextRound(game, clientId, recipes, rand) {
  if (game.host !== clientId) return 'Only the host deals.'
  if (game.phase !== 'scored') return 'The round is not over.'
  dealRound(game, recipes, rand)
  return null
}

/** A player who has gone: their pick is made for them, the first card. */
function autoPick(game, clientId) {
  const p = game.players.find((x) => x.id === clientId)
  if (p && game.phase === 'picking' && p.pick === null && p.hand.length)
    p.pick = 0
}

/**
 * What one player may see: their own hand, everyone's table, who has picked
 * (never what), hand sizes, scores. A copy, never the game.
 */
function view(game, clientId) {
  const seat = game.players.findIndex((p) => p.id === clientId)
  const me = game.players[seat] || {}
  const dealt = HAND[game.players.length] || 0
  // Hands pass left, so yours came from the seat on your right.
  const from = seat >= 0 ? game.players[(seat + 1) % game.players.length] : null
  return JSON.parse(
    JSON.stringify({
      code: game.code,
      host: game.host,
      phase: game.phase,
      round: game.round,
      rounds: ROUNDS,
      maxPlayers: MAX_PLAYERS,
      turn: me.hand ? dealt - me.hand.length + 1 : 0,
      turns: dealt,
      you: clientId,
      from: from && from.id !== clientId ? from.name : null,
      hand: me.hand || [],
      players: game.players.map((p) => ({
        id: p.id,
        name: p.name,
        played: p.played,
        picked: p.pick !== null,
        handSize: p.hand.length,
        desserts: p.desserts,
        score: p.score,
        rounds: p.rounds,
        dessertScore: p.dessertScore,
      })),
    })
  )
}

module.exports = {
  DECK,
  HAND,
  ROUNDS,
  MAX_PLAYERS,
  KIND_BY_CATEGORY,
  shuffle,
  pointsFor,
  sidesFor,
  buildDeck,
  tableauPoints,
  sidesPoints,
  scoreRound,
  dessertPoints,
  createGame,
  addPlayer,
  dealRound,
  start,
  pick,
  allPicked,
  resolveTurn,
  nextRound,
  restart,
  autoPick,
  view,
}

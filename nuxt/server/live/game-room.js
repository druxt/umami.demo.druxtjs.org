/**
 * The hub handler for `game:` channels: `game:new` creates an Umami Go game,
 * `game:CODE` is one. The deck comes from the recipes Drupal publishes at
 * each deal, so a recipe published mid-game joins the next round.
 */
const crypto = require('crypto')
const { getJson, text, LANG } = require('./drupal')
const { roomCode } = require('./code')
const game = require('./game')

const EMPTY_GAME_MS = 15 * 60 * 1000
/** A table nobody else joins closes after this long. */
const UNJOINED_GAME_MS = 10 * 60 * 1000
const MAX_GAMES = 200

/** A fair random source for dealing: crypto, not Math.random. */
const fairRand = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32

/** The published recipes, as cards need them. */
async function loadRecipes(drupalUrl, langcode = 'en') {
  if (!LANG.test(langcode)) return []
  const query = [
    'fields[node--recipe]=title,path,field_difficulty,field_number_of_servings,field_recipe_category,field_media_image',
    'fields[taxonomy_term--recipe_category]=name',
    'fields[media--image]=field_media_image',
    'fields[file--file]=uri',
    'include=field_recipe_category,field_media_image.field_media_image',
    'filter[status]=1',
    'page[limit]=50',
  ].join('&')
  const doc = await getJson(
    drupalUrl,
    `/${langcode}/jsonapi/node/recipe?${query}`
  )
  if (!doc || !Array.isArray(doc.data)) return []
  const included = new Map(
    (doc.included || []).map((r) => [`${r.type}:${r.id}`, r])
  )
  const rel = (r, name) => {
    const d = ((r.relationships || {})[name] || {}).data
    const one = Array.isArray(d) ? d[0] : d
    return one ? included.get(`${one.type}:${one.id}`) : null
  }
  return doc.data.map((r) => {
    const category = rel(r, 'field_recipe_category')
    const media = rel(r, 'field_media_image')
    const file = media && rel(media, 'field_media_image')
    return {
      title: text(r.attributes.title),
      path: `/${langcode}${(r.attributes.path || {}).alias || ''}`,
      difficulty: r.attributes.field_difficulty,
      servings: r.attributes.field_number_of_servings,
      category: category ? text(category.attributes.name) : '',
      image: file ? (file.attributes.uri || {}).url || null : null,
    }
  })
}

function gameHandler({
  drupalUrl,
  load = loadRecipes,
  rand = fairRand,
  log = () => {},
  unjoinedMs = UNJOINED_GAME_MS,
} = {}) {
  const games = new Map()
  const langs = new Map()
  const empty = new Map()

  /** A table still open that this visitor started, so they get one at most. */
  const openTableOf = (clientId) =>
    [...games.values()].find(
      (g) => g.creator === clientId && g.phase !== 'over'
    )

  /** Each player sees the game as they may: their hand, nobody else's. */
  const share = (hub, channel, g) => {
    for (const member of hub.members(channel))
      hub.send(member, 'game', channel, game.view(g, member.id))
  }
  const fail = (hub, client, channel, message) =>
    hub.send(client, 'error', channel, { message })

  /** Resolve the turn once every pick is in, and show everyone. */
  const settle = (hub, channel, g) => {
    if (game.resolveTurn(g))
      log(`game ${g.code}: round ${g.round} turn resolved`)
    share(hub, channel, g)
  }

  return {
    games,
    join(hub, channel, client) {
      const code = channel.slice(5)
      if (code === 'new') return
      const g = games.get(code)
      if (!g)
        return fail(
          hub,
          client,
          channel,
          'There is no game with that code. Ask the host for it again.'
        )
      clearTimeout(empty.get(code))
      const error = game.addPlayer(g, client.id, client.name)
      if (error) fail(hub, client, channel, `${error} You can watch.`)
      if (!g.host) g.host = client.id
      share(hub, channel, g)
    },
    resume(hub, channel, client) {
      const g = games.get(channel.slice(5))
      if (g) hub.send(client, 'game', channel, game.view(g, client.id))
    },
    leave(hub, channel, client) {
      const code = channel.slice(5)
      const g = games.get(code)
      if (!g) return
      const here = hub
        .members(channel)
        .filter((c) => c.send)
        .map((c) => c.id)
      // Gone for good: the table plays their first card so nobody waits.
      game.autoPick(g, client.id)
      if (!here.includes(g.host)) g.host = here[0] || null
      settle(hub, channel, g)
      if (!hub.members(channel).length) {
        const timer = setTimeout(() => games.delete(code), EMPTY_GAME_MS)
        if (timer.unref) timer.unref()
        empty.set(code, timer)
      }
    },
    async message(hub, channel, client, type, payload) {
      const code = channel.slice(5)
      if (code === 'new') {
        if (type !== 'create')
          return fail(hub, client, channel, 'Create a game first.')
        // One open table a visitor: asking again returns the one they have.
        const own = openTableOf(client.id)
        if (own) return hub.send(client, 'created', channel, { code: own.code })
        if (games.size >= MAX_GAMES)
          return fail(
            hub,
            client,
            channel,
            'Too many games are open. Try again later.'
          )
        const g = game.createGame(
          roomCode(new Set(games.keys()), rand),
          client.id
        )
        g.creator = client.id
        games.set(g.code, g)
        // A table set and left before anyone joins does not hold a place.
        const unjoined = setTimeout(() => {
          if (games.get(g.code) === g && g.players.length < 2) {
            games.delete(g.code)
            langs.delete(g.code)
          }
        }, unjoinedMs)
        if (unjoined.unref) unjoined.unref()
        langs.set(g.code, LANG.test(payload.langcode) ? payload.langcode : 'en')
        return hub.send(client, 'created', channel, { code: g.code })
      }
      const g = games.get(code)
      if (!g) return fail(hub, client, channel, 'This game has closed.')
      if (type === 'start' || type === 'next') {
        const recipes = await load(drupalUrl, langs.get(code))
        const error =
          type === 'start'
            ? game.start(g, client.id, recipes, rand)
            : game.nextRound(g, client.id, recipes, rand)
        if (error) return fail(hub, client, channel, error)
        return share(hub, channel, g)
      }
      if (type === 'again') {
        const error = game.restart(g, client.id)
        if (error) return fail(hub, client, channel, error)
        return share(hub, channel, g)
      }
      if (type === 'pick') {
        const error = game.pick(g, client.id, payload.index, payload.second)
        if (error) return fail(hub, client, channel, error)
        return settle(hub, channel, g)
      }
      if (type === 'nudge') {
        // The host plays for anyone who has dropped out.
        if (g.host !== client.id)
          return fail(hub, client, channel, 'Only the host nudges.')
        const here = new Set(
          hub
            .members(channel)
            .filter((c) => c.send)
            .map((c) => c.id)
        )
        for (const p of g.players) if (!here.has(p.id)) game.autoPick(g, p.id)
        return settle(hub, channel, g)
      }
      return fail(hub, client, channel, 'The game does not know that move.')
    },
  }
}

module.exports = { gameHandler, loadRecipes, fairRand, MAX_GAMES }

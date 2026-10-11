/**
 * Umami's names for people on the live socket: Drupal's for a signed-in
 * visitor, else a cooking name. The sockets module names nobody, so the site
 * does. A guest's name comes from their socket's id, so it stays the same for
 * as long as they do.
 */
const ADJECTIVES = [
  'Simmering',
  'Zesty',
  'Toasted',
  'Smoky',
  'Crispy',
  'Golden',
  'Peppery',
  'Saucy',
  'Tangy',
  'Herby',
]
const NOUNS = [
  'Saffron',
  'Basil',
  'Paprika',
  'Nutmeg',
  'Ginger',
  'Fennel',
  'Thyme',
  'Sumac',
  'Miso',
  'Clove',
]

/** A cooking name, the same one for the same id. */
function cookingName(id) {
  let hash = 0
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `${ADJECTIVES[hash % ADJECTIVES.length]} ${
    NOUNS[Math.floor(hash / ADJECTIVES.length) % NOUNS.length]
  }`
}

/** The sockets module's `name` option. */
const name = (user, client) =>
  user
    ? user.preferred_username || user.name
    : cookingName((client || {}).id || '')

module.exports = { name, cookingName }

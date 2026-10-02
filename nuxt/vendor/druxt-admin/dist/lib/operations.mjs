/**
 * An entity's operations, and the keys that walk them.
 *
 * Drupal decides what a user may do with an entity: edit it, see its
 * revisions, translate it, delete it. A decoupled site cannot know that, so it
 * has to be told, and these turn what Drupal said into the list a menu
 * renders. No Vue and no browser in here, so the decisions can be tested on
 * their own.
 */

/**
 * The operations a menu offers, in the order a reader wants them: what they
 * came to do, then the rest, then the one that destroys something.
 *
 * A site passes its own list to read fewer, or more.
 */
export const OPERATIONS = [
  'edit-form',
  'version-history',
  'drupal:content-translation-overview',
  'delete-form',
]

/** The operations that destroy something, which a site may want to confirm. */
export const DESTRUCTIVE = ['delete-form']

/**
 * The keys that walk a menu.
 *
 * `into` and `out` are a submenu's, and they are left and right here because
 * a submenu opens beside the menu. A menu whose submenu opens the other way
 * swaps them, which is why they are options rather than fixed.
 */
export const KEYS = {
  next: ['ArrowDown'],
  previous: ['ArrowUp'],
  into: ['ArrowLeft'],
  out: ['ArrowRight'],
  close: ['Escape'],
}

/**
 * The key map to use, from what the site asked for.
 *
 * @param {boolean|object} [keyboard] - `false` for none, `true` for the
 *   defaults, or a map of the movements to change.
 * @returns {object|null} The map, or null where the site wants no keys.
 */
export function resolveKeys(keyboard = true) {
  if (!keyboard) return null
  if (keyboard === true) return { ...KEYS }
  const asList = (value) =>
    (Array.isArray(value) ? value : [value]).filter(Boolean)
  return Object.fromEntries(
    Object.keys(KEYS).map((movement) => [
      movement,
      keyboard[movement] === undefined
        ? KEYS[movement]
        : asList(keyboard[movement]),
    ])
  )
}

/**
 * The movement a key press means, or null for a key that means nothing here.
 *
 * @param {object|null} keys - A map from resolveKeys().
 * @param {string} key - The `key` of a keyboard event.
 * @returns {string|null} `next`, `previous`, `into`, `out`, `close`, or null.
 */
export function movementFor(keys, key) {
  if (!keys) return null
  return (
    Object.keys(keys).find((movement) => keys[movement].includes(key)) || null
  )
}

/**
 * The index a movement lands on, wrapping at each end.
 *
 * @param {number} from - The index focus is on, or -1 for none.
 * @param {number} step - 1 or -1.
 * @param {number} length - How many items there are.
 * @returns {number} The index to move to, or -1 where there is nothing.
 */
export function moveTo(from, step, length) {
  if (!length) return -1
  if (from < 0) return step > 0 ? 0 : length - 1
  return (from + step + length) % length
}

/**
 * Whether an operation destroys what it acts on.
 *
 * @param {object} operation - An operation.
 * @param {string[]} [destructive] - The keys that destroy something.
 * @returns {boolean} True for a destructive operation.
 */
export function isDestructive(operation, destructive = DESTRUCTIVE) {
  return destructive.includes((operation || {}).key)
}

/**
 * The operations on a JSON:API resource, as a menu reads them.
 *
 * Drupal's links carry a title in `meta.linkParams.title`, and their `href` is
 * built on the host Drupal was asked on. Each href is returned as a path, so a
 * site serving Drupal on its own origin sends the reader there rather than to
 * the backend's hostname.
 *
 * A reader is sent no link at all for an operation they may not use, so there
 * is nothing here to hide from them.
 *
 * @param {object} resource - A JSON:API resource object.
 * @param {object} [options] - Options.
 * @param {string[]} [options.operations] - Which links to read, in order.
 * @param {string[]} [options.destructive] - Which of them destroy something.
 * @returns {Array<{ key: string, title: string, href: string, destructive: boolean }>} The operations.
 */
export function operationsFromLinks(resource, options = {}) {
  const links = (resource || {}).links || {}
  const wanted = options.operations || OPERATIONS
  return wanted
    .filter((key) => (links[key] || {}).href)
    .map((key) => {
      const link = links[key]
      const title = ((link.meta || {}).linkParams || {}).title || key
      const [path, query] = String(link.href).split('?')
      // The path, whatever host Drupal built the link on.
      const href =
        path.replace(/^[a-z]+:\/\/[^/]+/i, '') + (query ? `?${query}` : '')
      return {
        key,
        title,
        href,
        destructive: isDestructive({ key }, options.destructive),
      }
    })
}

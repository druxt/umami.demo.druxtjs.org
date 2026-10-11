/**
 * What a page does with a diff, as pure functions: which block an element
 * belongs to, whether a block has rendered, and where a removed block goes.
 *
 * The DOM comes in through `resolve(uuid, block)`, which returns the element
 * rendering an entity or null, so these run against any host: a page that
 * anchors its blocks with `@druxt-contrib/anchors`, one that marks them some
 * other way, or a test document. Nothing here reads a store or a backend.
 */
import { anchorUuid, normaliseDiff } from './diff.mjs'

/** The statuses marked in place; a removed block has no place to mark. */
export const MARKED = ['changed', 'added', 'moved']

/**
 * The element `@druxt-contrib/anchors` writes for an entity.
 *
 * @param {string} uuid - The entity's uuid.
 * @returns {Element|null} The element, or null when the page has none.
 */
export const resolveAnchor = (uuid) =>
  typeof document === 'undefined'
    ? null
    : document.querySelector(`[data-druxt-entity="${uuid}"]`)

/**
 * The uuids a block can be found under, the rendered side first.
 *
 * Which side a page renders is not always the side that was asked for: a
 * listing whose body stays the live content still has a diff, and its
 * elements carry the left uuid.
 *
 * @param {object} block - A block from `normaliseDiff()`.
 * @returns {string[]} One or two uuids, deduplicated.
 */
export const anchorsOf = (block) => {
  const right = anchorUuid(block, 'right')
  const left = anchorUuid(block, 'left')
  return [right, left].filter(
    (uuid, index, all) => uuid && all.indexOf(uuid) === index
  )
}

/**
 * The block an entity belongs to, by either of its uuids.
 *
 * @param {object[]} blocks - The blocks from `normaliseDiff()`.
 * @param {string} uuid - The entity's uuid.
 * @param {string} [status] - Only a block with this status.
 * @returns {object|null} The block, or null.
 */
export const blockFor = (blocks, uuid, status) => {
  if (!uuid) return null
  return (
    (blocks || []).find(
      (block) =>
        anchorsOf(block).includes(uuid) && (!status || block.status === status)
    ) || null
  )
}

/**
 * The element rendering a block, whichever side the page shows.
 *
 * @param {object} block - A block.
 * @param {Function} resolve - `(uuid, block) => Element|null`.
 * @returns {Element|null} The element, or null.
 */
export const elementFor = (block, resolve) =>
  anchorsOf(block)
    .map((uuid) => resolve(uuid, block))
    .find(Boolean) || null

/**
 * A diff as a view, whatever was handed over: a `jsonapi_diff` document is
 * normalised, a view (anything with `blocks`) is taken as it is.
 *
 * @param {object|null} document - The document or view.
 * @returns {object|null} The view, or null for nothing.
 */
export const viewOf = (document) => {
  if (!document) return null
  return Array.isArray(document.blocks) ? document : normaliseDiff(document)
}

/**
 * Whether an element has rendered its content: text, or an element, because
 * an image block never has any text.
 *
 * @param {Element|null} el - The element.
 * @returns {boolean} True once there is something in it.
 */
export const rendered = (el) =>
  Boolean(
    el &&
      (String(el.textContent || '').trim() ||
        (el.children && el.children.length > 0))
  )

/**
 * Resolves once every changed block has rendered, or when the wait runs out.
 *
 * @param {object[]} blocks - The blocks to wait for.
 * @param {Function} resolve - `(uuid, block) => Element|null`.
 * @param {object} [options] - `timeout`, `interval` and `settle`, in ms.
 * @returns {Promise<boolean>} True when every block rendered in time.
 */
export const waitRendered = (
  blocks,
  resolve,
  { timeout = 6000, interval = 150, settle = 0 } = {}
) => {
  const changed = (blocks || []).filter((b) => b.status === 'changed')
  const ready = () =>
    changed.every((block) => rendered(elementFor(block, resolve)))
  return new Promise((done) => {
    const started = Date.now()
    const check = () => {
      if (ready()) return setTimeout(() => done(true), settle)
      if (Date.now() - started > timeout)
        return setTimeout(() => done(false), settle)
      setTimeout(check, interval)
    }
    check()
  })
}

/**
 * Removed blocks, grouped by where they go on the page.
 *
 * A removed block sits beside the surviving block it followed or preceded.
 * One whose field lost every sibling has no neighbour; it goes after the last
 * block still on the page, or at the fallback element when nothing is, rather
 * than nowhere. A rebuilt draft (every block recreated) places none: there is
 * nothing left of the old page to sit beside.
 *
 * @param {object} view - The view from `viewOf()`.
 * @param {Function} resolve - `(uuid, block) => Element|null`.
 * @param {Element|null} [fallback] - Where a block with no neighbour goes when
 *   nothing of the page rendered.
 * @returns {Array<{ key: string, el: Element, side: 'after'|'before', blocks: object[] }>} The groups.
 */
export const groupRemoved = (view, resolve, fallback = null) => {
  const blocks = (view && view.blocks) || []
  const groups = new Map()
  const lastOnPage = () => {
    const els = blocks
      .filter((b) => b.status !== 'removed')
      .map((b) => elementFor(b, resolve))
      .filter(Boolean)
    return els[els.length - 1] || fallback || null
  }
  for (const block of view && view.rebuilt ? [] : blocks) {
    if (block.status !== 'removed') continue
    const hasNeighbour = Boolean(block.placeAfter || block.placeBefore)
    const neighbour = {
      placeUuids: block.placeUuids,
      uuid: block.placeAfter || block.placeBefore,
    }
    const anchor = hasNeighbour
      ? anchorsOf(neighbour).find((uuid) => resolve(uuid, block))
      : null
    const el = anchor ? resolve(anchor, block) : lastOnPage()
    if (!el) continue
    const side = block.placeBefore && anchor ? 'before' : 'after'
    const key = anchor ? `${side}:${anchor}` : `after:${block.field || 'page'}`
    if (!groups.has(key)) groups.set(key, { key, el, side, blocks: [] })
    groups.get(key).blocks.push(block)
  }
  return [...groups.values()]
}

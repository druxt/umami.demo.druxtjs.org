/**
 * Where a change sits on a page, as a percentage of it.
 *
 * The arithmetic a minimap rail needs, with no DOM in it, so it can be read
 * and tested on its own. Percentages rather than pixels, because the rail is
 * however tall the site draws it and a page that grows as its images load
 * only has to be measured again.
 */

/** Keeps a percentage on the page. */
const pin = (value) => Math.min(100, Math.max(0, value || 0))

/**
 * The smallest a mark may be, so a one-line change is still something a
 * reader can see and hit.
 */
const MIN_HEIGHT = 0.6

/**
 * Places each measured change on the rail.
 *
 * @param {Array<{top: number, height: number}>} boxes - Each change's offset
 *   from the top of the scrolling content, and its height, in pixels.
 * @param {number} total - The scrolling content's full height, in pixels.
 * @param {number} [minHeight] - The smallest mark, as a percentage.
 * @returns {Array<{top: number, height: number}>} Each one as a percentage.
 */
export const placeMarks = (boxes, total, minHeight = MIN_HEIGHT) => {
  if (!total) return []
  return (boxes || []).map((box) => ({
    top: pin(((box.top || 0) / total) * 100),
    height: Math.min(
      Math.max(pin(((box.height || 0) / total) * 100), minHeight),
      100
    ),
  }))
}

/**
 * The part of the page on screen, for the band that says where the reader is.
 *
 * @param {number} at - How far the content is scrolled, in pixels.
 * @param {number} shown - The height on screen, in pixels.
 * @param {number} total - The scrolling content's full height, in pixels.
 * @returns {{top: number, height: number}} The band, as percentages.
 */
export const placeViewport = (at, shown, total) => {
  if (!total) return { top: 0, height: 0 }
  return { top: pin((at / total) * 100), height: pin((shown / total) * 100) }
}

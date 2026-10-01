import { diffDirective } from '@druxt-contrib/diff'

/**
 * A field's value as words: the text of its HTML, a list joined by lines.
 * The marks compare words, and Drupal's copy of a text is plain where the
 * editor's carries paragraph tags.
 */
export function plain(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(plain).join('\n')
  if (typeof value === 'object') {
    return plain('value' in value ? value.value : value.title)
  }
  const text = String(value)
  if (typeof document === 'undefined' || !/<[a-z!/]/i.test(text)) return text
  const template = document.createElement('template')
  template.innerHTML = text.replace(/<\/(p|li|h[1-6]|div|br)>/gi, '$&\n')
  return template.content.textContent
}

/**
 * What to mark on an entity's field: Drupal's words against the draft's,
 * while the page shows the draft and the editor asked for the marks. Null
 * otherwise, so the same value covers "nothing to show".
 */
/** What a relationship points at, as ids. */
const pointsAt = (value) => {
  const data = (value || {}).data
  return (Array.isArray(data) ? data : data ? [data] : [])
    .map((o) => o.id)
    .join(', ')
}

/** The first store copy of a resource, whichever language prefix holds it. */
const stored = (store, type, id) => {
  const byPrefix = (((store || {}).state || {}).druxt || {}).resources || {}
  const doc = Object.values((byPrefix[type] || {})[id] || {}).find(
    (o) => o && o.data
  )
  return (doc || {}).data
}

/** The file a media reference points at, as the frontend serves it. */
export function fileOfMedia(store, value, baseUrl = '') {
  const media = ((value || {}).data || {}).id
    ? value.data
    : ((value || {}).data || [])[0]
  const image = media && media.id && stored(store, media.type, media.id)
  const ref = ((image || {}).relationships || {}).field_media_image || {}
  const file = (ref.data || {}).id && stored(store, ref.data.type, ref.data.id)
  const url = (((file || {}).attributes || {}).uri || {}).url
  return url ? baseUrl + url : null
}

/**
 * What to mark on an entity's field: Drupal's words against the draft's,
 * while the page shows the draft and the editor asked for the marks. A
 * relationship has no words: it says what it replaced instead. Null
 * otherwise, so the same value covers "nothing to show".
 */
export function diffFor(store, drafts, entity, name) {
  if (!entity || !entity.type || !entity.id || !name || !drafts) return null
  const { type, id } = entity
  const langcode = entity.langcode || 'en'
  if (
    !drafts.isMarking(type, id, langcode) ||
    drafts.isReal(type, id, langcode)
  ) {
    return null
  }
  const draft = drafts.draftFor(type, id, langcode)
  if (!draft) return null
  const before = draft.before || {}
  if (name in (draft.relationships || {})) {
    const left = pointsAt((before.relationships || {})[name])
    const right = pointsAt(draft.relationships[name])
    return left === right
      ? null
      : {
          relationship: true,
          left,
          right,
          previous: (before.relationships || {})[name],
        }
  }
  if (!(name in (draft.attributes || {}))) return null
  const left = plain((before.attributes || {})[name])
  const right = plain(draft.attributes[name])
  return left === right ? null : { left, right }
}

const KEY = '__umamiDraftMark'
const ORIGINAL = '__umamiDraftOriginal'
const SWAPPED = 'v-diff-swapped'

/** The marked host a mark belongs to: the nearest ancestor this file synced. */
const hostOf = (mark) => {
  for (let p = mark.parentElement; p; p = p.parentElement) {
    if (Object.prototype.hasOwnProperty.call(p, KEY)) return p
  }
  return null
}

/**
 * Whether `el` carries marks of its own. A field inside a field (an entity
 * reference renders the entity's fields) carries the inner field's marks
 * too, and those are not this element's to restore.
 */
const hasOwnMarks = (el) =>
  Array.from(el.querySelectorAll('.v-diff-ins, .v-diff-del')).some(
    (mark) => hostOf(mark) === el
  )

/** The chip on a replaced field: what it was, and that it was replaced. */
const swapChip = ({ words = {}, previousImage }) => {
  const chip = document.createElement('span')
  chip.className = 'v-diff-swap'
  const was = document.createElement('del')
  was.className = 'v-diff-del'
  was.textContent = words.was || ''
  if (previousImage) {
    const img = document.createElement('img')
    img.src = previousImage
    img.alt = ''
    was.appendChild(img)
  }
  const now = document.createElement('ins')
  now.className = 'v-diff-ins'
  now.textContent = words.replaced || ''
  chip.appendChild(was)
  chip.appendChild(now)
  return chip
}

/**
 * Bring an element's marks in line with `diff`. Idempotent: an element
 * already marked for the same diff is left alone, and one Vue has just
 * re-rendered (its marks gone) is marked afresh.
 */
export function sync(el, diff) {
  if (!el || el.nodeType !== 1) return
  const key = diff ? `${diff.left}\u0000${diff.right}` : ''
  if (!key && !el[KEY]) return
  const marked = hasOwnMarks(el)
  if (marked && el[KEY] === key) return
  if (marked && el[ORIGINAL] != null) el.innerHTML = el[ORIGINAL]
  el.classList.remove(SWAPPED)
  el[KEY] = key
  if (!diff) return
  el[ORIGINAL] = el.innerHTML
  if (diff.relationship) {
    el.classList.add(SWAPPED)
    el.appendChild(swapChip(diff))
    return
  }
  diffDirective.bind(el, { value: diff })
}

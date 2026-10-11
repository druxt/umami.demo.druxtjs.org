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
export function diffFor(store, drafts, entity, name) {
  if (!entity || !entity.type || !entity.id || !name || !drafts) return null
  const { type, id } = entity
  if (!drafts.isMarking(type, id) || drafts.isReal(type, id)) return null
  const draft = drafts.draftFor(type, id)
  if (!draft || !(name in (draft.attributes || {}))) return null
  const left = plain(((draft.before || {}).attributes || {})[name])
  const right = plain(draft.attributes[name])
  return left === right ? null : { left, right }
}

const KEY = '__umamiDraftMark'
const ORIGINAL = '__umamiDraftOriginal'

/**
 * Bring an element's marks in line with `diff`. Idempotent: an element
 * already marked for the same diff is left alone, and one Vue has just
 * re-rendered (its marks gone) is marked afresh.
 */
export function sync(el, diff) {
  if (!el || el.nodeType !== 1) return
  const key = diff ? `${diff.left}\u0000${diff.right}` : ''
  if (!key && !el[KEY]) return
  const marked = !!el.querySelector('.v-diff-ins, .v-diff-del')
  if (marked && el[KEY] === key) return
  if (marked) el.innerHTML = el[ORIGINAL]
  el[KEY] = key
  if (!diff) return
  el[ORIGINAL] = el.innerHTML
  diffDirective.bind(el, { value: diff })
}

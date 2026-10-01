/** What Drupal computes from a value and never takes back: left out of a comparison. */
const COMPUTED = ['processed']

/** A field value without what Drupal computed from it. */
export function withoutComputed(value) {
  if (Array.isArray(value)) return value.map(withoutComputed)
  if (!value || typeof value !== 'object') return value
  const kept = {}
  for (const [key, item] of Object.entries(value)) {
    if (!COMPUTED.includes(key)) kept[key] = item
  }
  return kept
}

/** The fields whose value differs between two attribute sets, with the edited value. */
export function changedFields(original = {}, edited = {}) {
  const changed = {}
  for (const [field, value] of Object.entries(edited)) {
    const next = withoutComputed(value)
    if (!same(withoutComputed(original[field]), next)) changed[field] = next
  }
  return changed
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Where an editor's unsaved changes wait for the next visit. */
export const DRAFTS_KEY = 'umamiDrafts'

export function readDrafts() {
  try {
    return JSON.parse(window.localStorage.getItem(DRAFTS_KEY)) || {}
  } catch (e) {
    return {}
  }
}

export function writeDrafts(drafts) {
  try {
    if (Object.keys(drafts || {}).length) {
      window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts))
    } else {
      window.localStorage.removeItem(DRAFTS_KEY)
    }
  } catch (e) {
    // No storage: the draft lasts as long as the page does.
  }
}

/**
 * What the form changed: the fields that differ from the entity as Drupal
 * holds it, and Drupal's values for them, so the change can be undone.
 * Null when nothing differs.
 */
export function draftOf(original, model) {
  const attributes = changedFields(
    original.attributes || {},
    model.attributes || {}
  )
  const relationships = {}
  for (const [field, value] of Object.entries(model.relationships || {})) {
    if (!same((original.relationships || {})[field], value)) {
      relationships[field] = value
    }
  }
  if (!Object.keys(attributes).length && !Object.keys(relationships).length) {
    return null
  }
  const before = { attributes: {}, relationships: {} }
  for (const field of Object.keys(attributes)) {
    before.attributes[field] = withoutComputed(
      (original.attributes || {})[field]
    )
  }
  for (const field of Object.keys(relationships)) {
    before.relationships[field] = (original.relationships || {})[field]
  }
  return { attributes, relationships, files: {}, before }
}

/**
 * Text fields as the page renders them. Drupal sends `processed`, the
 * filtered HTML the page shows, and an edit brings only `value`; the store
 * merges the two and keeps the old `processed`. The edited value stands in
 * for it until Drupal has filtered the saved text.
 */
export function renderable(attributes) {
  const out = {}
  for (const [name, value] of Object.entries(attributes || {})) {
    out[name] =
      value && typeof value === 'object' && typeof value.value === 'string'
        ? { ...value, processed: value.value }
        : value
  }
  return out
}

/** The entity with a draft laid over it. */
export function withDraft(data, draft) {
  if (!draft || !data) return data
  return {
    ...data,
    attributes: {
      ...(data.attributes || {}),
      ...renderable(draft.attributes || {}),
    },
    relationships: {
      ...(data.relationships || {}),
      ...(draft.relationships || {}),
    },
  }
}

/** The entity as Drupal holds it: the draft's before values put back. */
export function withoutDraft(data, draft) {
  return withDraft(data, (draft || {}).before)
}

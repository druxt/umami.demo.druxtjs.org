import {
  changedFields,
  diffLines,
  isLong,
  stagedDiff,
  withoutComputed,
} from '@druxt-contrib/inline-content-edit'

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

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

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

/**
 * What a draft changed, field by field, in the shape jsonapi_diff would
 * return for two revisions: `data.attributes.fields[name]` with a status,
 * both sides as text, and for a long text the changed words with a little
 * context. Relationships are listed by what they point at.
 */
export function diffOf(original, draft) {
  const document = stagedDiff(
    { ...original, attributes: (original || {}).attributes || {} },
    {
      type: (original || {}).type,
      id: (original || {}).id,
      attributes: (draft || {}).attributes || {},
    }
  )
  const fields = Object.values(document.data.attributes.fields).map(
    (field) => ({
      ...field,
      words:
        field.status === 'changed' &&
        (isLong(field.left) || isLong(field.right))
          ? diffLines(field.left, field.right)
          : null,
    })
  )
  const pointsAt = (value) => {
    const data = (value || {}).data
    return (Array.isArray(data) ? data : data ? [data] : [])
      .map((o) => o.id)
      .join(', ')
  }
  for (const [name, value] of Object.entries(
    (draft || {}).relationships || {}
  )) {
    const before = ((draft || {}).before || {}).relationships || {}
    fields.push({
      label: name,
      status: 'changed',
      left: pointsAt(before[name]),
      right: pointsAt(value),
      ops: [],
      words: null,
    })
  }
  return { ...document, fields }
}

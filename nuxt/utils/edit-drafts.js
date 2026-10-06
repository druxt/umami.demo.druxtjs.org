import {
  changedFields,
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

/** The entity with a draft laid over it. */
export function withDraft(data, draft) {
  if (!draft || !data) return data
  return {
    ...data,
    attributes: { ...(data.attributes || {}), ...(draft.attributes || {}) },
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

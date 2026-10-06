/**
 * The fields that differ between two JSON:API resources of one entity:
 * attributes by value, relationships by what they point at. Drupal's own
 * bookkeeping (the changed time, revision ids) is left out, so a save names
 * what the editor changed.
 */
const BOOKKEEPING =
  /^(changed|revision_|drupal_internal__|default_langcode|content_translation_|metatag|path$)/

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Where a relationship points: its ids, without the meta that varies. */
const target = (rel) => {
  const data = (rel || {}).data
  const ids = (Array.isArray(data) ? data : [data]).filter(Boolean)
  return ids.map((d) => `${d.type}:${d.id}`)
}

export function changedFields(before, after) {
  if (!before || !after) return []
  const out = []
  const attrs = { ...before.attributes, ...after.attributes }
  for (const key of Object.keys(attrs)) {
    if (BOOKKEEPING.test(key)) continue
    if (!same((before.attributes || {})[key], (after.attributes || {})[key]))
      out.push(key)
  }
  const relationships = { ...before.relationships, ...after.relationships }
  for (const key of Object.keys(relationships)) {
    if (BOOKKEEPING.test(key)) continue
    const a = target((before.relationships || {})[key])
    const b = target((after.relationships || {})[key])
    if (!same(a, b)) out.push(key)
  }
  return out
}

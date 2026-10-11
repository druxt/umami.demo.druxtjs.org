/**
 * What a purge means for an open page: which entities in the Druxt store the
 * purged cache tags name, and whether any listing changed. Plain functions,
 * so the mapping is testable without a browser.
 */

/** The internal id attribute for each entity type a tag names. */
const INTERNAL_ID = {
  node: 'drupal_internal__nid',
  taxonomy_term: 'drupal_internal__tid',
  media: 'drupal_internal__mid',
  file: 'drupal_internal__fid',
  block_content: 'drupal_internal__id',
  menu_link_content: 'drupal_internal__id',
}

/** A tag that changes listings: a list tag, a menu, or a view's config. */
const LISTS =
  /(_list(:|$))|^config:(system\.menu|views\.view)\.|^menu_link_content/

/**
 * The store's resources the tags name, as `{ type, id }`, and whether a
 * listing changed. Druxt fetches sparse fieldsets, so a resource may not
 * carry its internal id: an entity tag that names nothing in the store turns
 * into its entity type (`node`), and every entity of that type refreshes.
 * No tags at all means the purge did not say: everything.
 */
export function affected(tags, resources) {
  if (!tags || !tags.length) {
    return { everything: true, entities: [], types: [], lists: true }
  }
  const wanted = {}
  for (const tag of tags) {
    const [entityType, id] = tag.split(':')
    if (INTERNAL_ID[entityType] && /^\d+$/.test(id || '')) {
      ;(wanted[entityType] = wanted[entityType] || new Set()).add(Number(id))
    }
  }
  const entities = []
  for (const [type, byId] of Object.entries(resources || {})) {
    const entityType = type.split('--')[0]
    const ids = wanted[entityType]
    if (!ids) continue
    for (const [uuid, byPrefix] of Object.entries(byId || {})) {
      const match = Object.values(byPrefix || {}).some((doc) => {
        const attributes = ((doc || {}).data || {}).attributes || {}
        return ids.has(Number(attributes[INTERNAL_ID[entityType]]))
      })
      if (match) entities.push({ type, id: uuid })
    }
  }
  const found = new Set(entities.map((e) => e.type.split('--')[0]))
  const types = Object.keys(wanted).filter((t) => !found.has(t))
  const lists = tags.some((tag) => LISTS.test(tag))
  return { everything: false, entities, types, lists }
}

/** Whether a component shows something the purge changed. */
export function shows(vm, change) {
  const name = vm.$options.name
  if (name === 'DruxtEntity') {
    // An open form keeps what the editor is typing.
    if ((vm.schemaType || 'view') === 'form') return false
    return (
      change.everything ||
      change.entities.some((e) => e.id === vm.uuid) ||
      change.types.includes(String(vm.type || '').split('--')[0])
    )
  }
  if (name === 'DruxtView' || name === 'DruxtMenu') {
    return change.everything || change.lists
  }
  return false
}

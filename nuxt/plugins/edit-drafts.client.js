import { readDrafts, withDraft, writeDrafts } from '~/utils/edit-drafts'

/**
 * An editor's unsaved changes, kept and shown.
 *
 * The edit form writes what changed into the `druxtIce` drafts. This keeps
 * those drafts across reloads, lays each one over its entity in the Druxt
 * store, and refreshes whatever is showing that entity, so the View tab
 * previews the draft and the form finds it again. Nothing runs before the
 * page has hydrated.
 */
export default ({ store }, inject) => {
  const key = (type, id) => `${type}:${id}`
  const draftFor = (type, id) =>
    ((store.state.druxtIce || {}).drafts || {})[key(type, id)] || null

  /** Every mounted DruxtEntity showing this entity renders `data`. */
  const refresh = (type, id, data) => {
    const visit = (vm) => {
      if (
        vm.$options.name === 'DruxtEntity' &&
        vm.uuid === id &&
        vm.model &&
        vm.model.type === type &&
        JSON.stringify(vm.model) !== JSON.stringify(data)
      ) {
        vm.model = data
      }
      vm.$children.forEach(visit)
    }
    if (window.$nuxt) visit(window.$nuxt)
  }

  /** The ids a relationship points at, which is all a draft can change. */
  const pointsAt = (value) => {
    const data = (value || {}).data
    return JSON.stringify(
      (Array.isArray(data) ? data : data ? [data] : []).map((o) => o.id)
    )
  }

  /**
   * Whether the store copy already carries the draft. Field by field, not
   * the whole document: the store merges into what it holds, so an old
   * relationship's meta survives under the new id and the documents never
   * compare equal.
   */
  const carries = (data, draft) =>
    Object.entries(draft.attributes || {}).every(
      ([f, v]) =>
        JSON.stringify((data.attributes || {})[f]) === JSON.stringify(v)
    ) &&
    Object.entries(draft.relationships || {}).every(
      ([f, v]) => pointsAt((data.relationships || {})[f]) === pointsAt(v)
    )

  // Commits made here come back through the subscriber; they are not new.
  let applying = false

  /** Lay `draft` over the entity wherever the Druxt store holds it. */
  const overlay = (type, id, draft) => {
    const byPrefix = ((store.state.druxt || {}).resources || {})[type] || {}
    let shown = null
    applying = true
    try {
      for (const [prefix, doc] of Object.entries(byPrefix[id] || {})) {
        if (!doc || !doc.data) continue
        const data = withDraft(doc.data, draft)
        shown = data
        if (carries(doc.data, draft)) continue
        store.commit('druxt/addResource', {
          prefix: prefix === 'undefined' ? undefined : prefix,
          resource: { ...doc, data },
        })
      }
    } finally {
      applying = false
    }
    if (shown) refresh(type, id, shown)
  }

  /** The store mirrors the form: `model` is what the entity is now. */
  const mirror = (model) => {
    if (!model || !model.type || !model.id) return
    const byPrefix =
      ((store.state.druxt || {}).resources || {})[model.type] || {}
    applying = true
    try {
      for (const [prefix, doc] of Object.entries(byPrefix[model.id] || {})) {
        if (!doc || !doc.data) continue
        // Plain copies: the store must not share objects with the form.
        const data = JSON.parse(
          JSON.stringify({
            ...doc.data,
            attributes: model.attributes || {},
            relationships: model.relationships || {},
          })
        )
        if (carries(doc.data, data)) continue
        store.commit('druxt/addResource', {
          prefix: prefix === 'undefined' ? undefined : prefix,
          resource: { ...doc, data },
        })
      }
    } finally {
      applying = false
    }
    refresh(model.type, model.id, JSON.parse(JSON.stringify(model)))
  }

  inject('drafts', { overlay, mirror, draftFor })

  window.onNuxtReady(() => {
    for (const [k, draft] of Object.entries(readDrafts())) {
      store.commit('druxtIce/setDraft', { key: k, draft })
    }
    for (const k of Object.keys((store.state.druxtIce || {}).drafts || {})) {
      const [type, id] = k.split(':')
      overlay(type, id, draftFor(type, id))
    }

    store.subscribe(({ type, payload }) => {
      if (type === 'druxtIce/setDraft' || type === 'druxtIce/clearDraft') {
        writeDrafts(store.state.druxtIce.drafts)
      }
      // A fresh copy of a drafted entity arrives: the draft goes back on top.
      if (type === 'druxt/addResource' && !applying) {
        const data = ((payload || {}).resource || {}).data || {}
        const draft = draftFor(data.type, data.id)
        if (draft) overlay(data.type, data.id, draft)
      }
    })
  })
}

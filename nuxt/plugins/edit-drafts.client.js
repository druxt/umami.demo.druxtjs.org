import Vue from 'vue'
import {
  readDrafts,
  renderable,
  withDraft,
  withoutDraft,
  writeDrafts,
} from '~/utils/edit-drafts'

/**
 * An editor's unsaved changes, kept and shown.
 *
 * The edit form writes what changed into the `drafts` store. This keeps
 * those drafts across reloads, lays each one over its entity in the Druxt
 * store, and refreshes whatever is showing that entity, so the View tab
 * previews the draft and the form finds it again. Nothing runs before the
 * page has hydrated.
 */
export default ({ store }, inject) => {
  // One draft per translation: the English draft stays off the Spanish page.
  const key = (type, id, langcode) => `${type}:${id}:${langcode}`
  const draftFor = (type, id, langcode) =>
    ((store.state.drafts || {}).drafts || {})[key(type, id, langcode)] || null
  /**
   * The language a store copy is in: its prefix, or the site's default for
   * a copy fetched without one (keyed 'undefined' in the store).
   */
  const langOfPrefix = (prefix) => {
    const p = String(prefix || '').replace(/^\//, '')
    return p && p !== 'undefined' ? p : 'en'
  }
  const langOf = (data) => ((data || {}).attributes || {}).langcode || 'en'

  /**
   * The fields an entity rendered keep the value they were mounted with, so
   * a new model on the entity is handed down to each of them as well.
   */
  const refreshFields = (vm, data) => {
    for (const child of vm.$children) {
      if (child.$options.name === 'DruxtEntity') continue
      const name =
        child.$options.name === 'DruxtField' && (child.schema || {}).id
      if (name) {
        const value = child.relationship
          ? (data.relationships || {})[name]
          : (data.attributes || {})[name]
        if (
          value !== undefined &&
          JSON.stringify(child.model) !== JSON.stringify(value)
        ) {
          child.model = value
        }
      }
      refreshFields(child, data)
    }
  }

  /** Every mounted DruxtEntity showing this entity renders `data`. */
  const refresh = (type, id, data, langcode) => {
    const visit = (vm) => {
      if (
        vm.$options.name === 'DruxtEntity' &&
        vm.uuid === id &&
        vm.model &&
        vm.model.type === type &&
        (vm.lang || 'en') === langcode
      ) {
        if (JSON.stringify(vm.model) !== JSON.stringify(data)) vm.model = data
        refreshFields(vm, data)
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
  const overlay = (type, id, langcode, draft) => {
    const byPrefix = ((store.state.druxt || {}).resources || {})[type] || {}
    let shown = null
    applying = true
    try {
      for (const [prefix, doc] of Object.entries(byPrefix[id] || {})) {
        if (!doc || !doc.data || langOfPrefix(prefix) !== langcode) continue
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
    if (shown) refresh(type, id, shown, langcode)
  }

  /** The store mirrors the form: `model` is what the entity is now. */
  const mirror = (model) => {
    if (!model || !model.type || !model.id) return
    const byPrefix =
      ((store.state.druxt || {}).resources || {})[model.type] || {}
    // As the page renders it: the form's text stands in for Drupal's
    // filtered HTML. Plain copies, one per use: the store, the page and
    // the form must not share objects.
    const shown = JSON.stringify({
      ...model,
      attributes: renderable(model.attributes || {}),
      relationships: model.relationships || {},
    })
    const copy = () => JSON.parse(shown)
    const langcode = langOf(model)
    applying = true
    try {
      for (const [prefix, doc] of Object.entries(byPrefix[model.id] || {})) {
        if (!doc || !doc.data || langOfPrefix(prefix) !== langcode) continue
        const { attributes, relationships } = copy()
        const data = { ...doc.data, attributes, relationships }
        if (carries(doc.data, data)) continue
        store.commit('druxt/addResource', {
          prefix: prefix === 'undefined' ? undefined : prefix,
          resource: { ...doc, data },
        })
      }
    } finally {
      applying = false
    }
    refresh(model.type, model.id, copy(), langcode)
  }

  // Entities an editor asked to see as Drupal holds them, draft kept aside,
  // and entities whose changes are marked in the page.
  const real = Vue.observable({ keys: {}, marks: {} })
  const isReal = (type, id, langcode) => !!real.keys[key(type, id, langcode)]
  const isMarking = (type, id, langcode) =>
    !!real.marks[key(type, id, langcode)]
  const showChanges = (type, id, langcode, on) => {
    Vue.set(real.marks, key(type, id, langcode), !!on)
  }

  /** Show Drupal's version of an entity, or the draft again. */
  const showReal = (type, id, langcode, on) => {
    const draft = draftFor(type, id, langcode)
    if (!draft) return
    Vue.set(real.keys, key(type, id, langcode), !!on)
    const byPrefix = ((store.state.druxt || {}).resources || {})[type] || {}
    applying = true
    try {
      for (const [prefix, doc] of Object.entries(byPrefix[id] || {})) {
        if (!doc || !doc.data || langOfPrefix(prefix) !== langcode) continue
        const data = on
          ? withoutDraft(doc.data, draft)
          : withDraft(doc.data, draft)
        store.commit('druxt/addResource', {
          prefix: prefix === 'undefined' ? undefined : prefix,
          resource: { ...doc, data },
        })
        refresh(type, id, data, langcode)
      }
    } finally {
      applying = false
    }
  }

  /** Drops a draft: Drupal's version is back in the page and nothing is kept. */
  const discard = (type, id, langcode) => {
    if (!draftFor(type, id, langcode)) return
    showReal(type, id, langcode, true)
    store.commit('drafts/clearDraft', key(type, id, langcode))
    // An open form holds the draft's values still; it puts Drupal's back.
    if (window.$nuxt)
      window.$nuxt.$emit('drafts:discarded', key(type, id, langcode))
  }

  inject('drafts', {
    overlay,
    mirror,
    draftFor,
    showReal,
    isReal,
    showChanges,
    isMarking,
    discard,
    real,
  })

  window.onNuxtReady(() => {
    for (const [k, draft] of Object.entries(readDrafts())) {
      store.commit('drafts/setDraft', { key: k, draft })
    }
    for (const k of Object.keys((store.state.drafts || {}).drafts || {})) {
      const [type, id, langcode] = k.split(':')
      // A draft from before drafts carried a language is dropped.
      if (!langcode) store.commit('drafts/clearDraft', k)
      else overlay(type, id, langcode, draftFor(type, id, langcode))
    }

    store.subscribe(({ type, payload }) => {
      if (type === 'drafts/setDraft' || type === 'drafts/clearDraft') {
        writeDrafts(store.state.drafts.drafts)
      }
      // A fresh copy of a drafted entity arrives: the draft goes back on top.
      if (type === 'druxt/addResource' && !applying) {
        const data = ((payload || {}).resource || {}).data || {}
        const langcode = langOf(data)
        const draft = draftFor(data.type, data.id, langcode)
        if (draft && !isReal(data.type, data.id, langcode)) {
          overlay(data.type, data.id, langcode, draft)
        }
      }
      // A draft that is gone leaves nothing to show instead of the page.
      if (type === 'drafts/clearDraft') {
        if (real.keys[payload]) Vue.set(real.keys, payload, false)
        if (real.marks[payload]) Vue.set(real.marks, payload, false)
      }
    })
  })
}

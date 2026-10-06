/**
 * Drupal's displays, live. When an editor saves a Manage display form, Drupal
 * purges the display's config tag: open pages flush their Druxt schemas and
 * refetch the entities of that bundle, which fetch the regenerated schema
 * from /_druxt/schema/<id> and render in the new order.
 *
 * A page opened with `?druxt-preview=<key>` from Drupal's form also follows
 * that form unsaved: the site's server builds a Druxt schema from each change,
 * order, labels, formatters and their settings, and sends it on
 * `display:<key>`. It applies in this browser only.
 */
import Vue from 'vue'

const DISPLAY_TAG =
  /^config:core\.entity_view_display\.([a-z0-9_]+)\.([a-z0-9_]+)\.([a-z0-9_]+)$/
const STORAGE = 'umamiDisplayPreview'
const KEY = /^[A-Za-z0-9_-]{16,64}$/

const storage = {
  get: () => {
    try {
      return window.sessionStorage.getItem(STORAGE)
    } catch (e) {
      return null
    }
  },
  set: (value) => {
    try {
      if (value) window.sessionStorage.setItem(STORAGE, value)
      else window.sessionStorage.removeItem(STORAGE)
    } catch (e) {}
  },
}

export default ({ $sockets, store }, inject) => {
  const state = Vue.observable({ key: null, draft: null })

  /** Refetch every DruxtEntity of a type, `node--recipe`, so it reloads its schema. */
  const refetch = (type) => {
    const visit = (vm) => {
      if (
        vm.$options.name === 'DruxtEntity' &&
        vm.type === type &&
        typeof vm.$fetch === 'function'
      )
        Promise.resolve(vm.$fetch()).then(() =>
          vm.$nextTick(() => refetchFields(vm))
        )
      vm.$children.forEach(visit)
    }
    if (window.$nuxt) visit(window.$nuxt)
  }

  /**
   * A field picks its component when it fetches, so one whose formatter
   * changed fetches again to pick the new formatter's. Fields of entities
   * nested inside are their own entity's business.
   */
  const refetchFields = (entity) => {
    const walk = (vm) =>
      vm.$children.forEach((child) => {
        if (child.$options.name === 'DruxtEntity') return
        if (
          child.$options.name === 'DruxtField' &&
          typeof child.$fetch === 'function'
        )
          child.$fetch()
        walk(child)
      })
    walk(entity)
  }

  /** The unsaved display's schema, in place of the saved one. */
  const apply = (draft) => {
    store.commit('druxtSchema/addSchema', {
      id: draft.schemaId,
      schema: draft.schema,
    })
    refetch(draft.schemaId.split('--').slice(0, 2).join('--'))
  }

  const preview = {
    state,
    /** Follow the form holding this key, until stopped. */
    start(key) {
      if (!$sockets || !KEY.test(String(key))) return
      state.key = key
      storage.set(key)
      $sockets.join(`display:${key}`)
    },
    stop() {
      if (state.key && $sockets) $sockets.leave(`display:${state.key}`)
      const draft = state.draft
      state.key = null
      state.draft = null
      storage.set(null)
      // Back to the saved display.
      store.commit('druxtSchema/flushSchemas')
      if (draft) refetch(draft.schemaId.split('--').slice(0, 2).join('--'))
    },
  }
  inject('displayPreview', preview)

  if (!$sockets) return

  $sockets.on('draft', ({ channel, payload }) => {
    if (!state.key || channel !== `display:${state.key}`) return
    state.draft = payload
    apply(payload)
  })

  // A saved display: every page that shows its bundle renders it anew.
  $sockets.on('content:changed', ({ payload }) => {
    const types = new Set(
      (payload.tags || [])
        .map((tag) => DISPLAY_TAG.exec(tag))
        .filter(Boolean)
        .map(([, entity, bundle]) => `${entity}--${bundle}`)
    )
    if (!types.size) return
    store.commit('druxtSchema/flushSchemas')
    // A preview in progress stays on its draft over the newly saved display.
    if (state.draft) apply(state.draft)
    types.forEach(refetch)
  })

  const fromUrl = new URLSearchParams(window.location.search).get(
    'druxt-preview'
  )
  const key = fromUrl || storage.get()
  if (key) preview.start(key)
}

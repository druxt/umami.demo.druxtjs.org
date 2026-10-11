import Vue from 'vue'
import { describe } from '~/utils/inspector'

/**
 * The dev overlay's eyes. A global mixin tags every mounted Druxt module
 * component (regions, blocks, menus, views, entities, forms, fields) with
 * what it is and what rendered it; AppDruxtInspector draws the labels in a
 * layer of its own. Nothing here touches server-rendered markup, so the
 * overlay can never make hydration differ.
 */

const ROOT_CLASS = 'druxt-inspector'

/** Reactive registry the layer renders from. */
const inspector = Vue.observable({
  items: [],
  hovered: null,
  tick: 0,
})

const tagged = new Map()

const tag = (vm) => {
  const el = vm.$el
  if (!el || el.nodeType !== 1) return
  const info = describe(vm)
  if (!info) return

  el.setAttribute('data-druxt', info.kind)
  tagged.set(vm, { el, ...info })
  schedule()
}

const untag = (vm) => {
  if (tagged.delete(vm)) schedule()
}

let frame = null

/** Rebuild the item list on the next frame; many components mount at once. */
const schedule = () => {
  if (frame) return
  frame = window.requestAnimationFrame(() => {
    frame = null
    if (!document.documentElement.classList.contains(ROOT_CLASS)) return
    inspector.items = [...tagged.values()]
    inspector.tick++
  })
}

const isOn = (state) => !!(state.ui || {}).devOverlay

export default ({ store }, inject) => {
  Vue.mixin({
    mounted() {
      tag(this)
    },
    updated() {
      tag(this)
    },
    destroyed() {
      untag(this)
    },
  })

  const apply = () => {
    document.documentElement.classList.toggle(ROOT_CLASS, isOn(store.state))
    schedule()
  }
  store.watch(isOn, apply)
  window.onNuxtReady(apply)

  // Hover names the innermost component under the pointer; the layer shows
  // that field's label, since fields are too many to label all at once.
  const hover = (event) => {
    const el =
      (event.target.closest && event.target.closest('[data-druxt]')) || null
    if (el !== inspector.hovered) inspector.hovered = el
  }
  document.addEventListener('mouseover', hover, { passive: true })
  document.addEventListener('touchstart', hover, { passive: true })

  inject('inspector', inspector)
}

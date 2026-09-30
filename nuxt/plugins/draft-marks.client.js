import Vue from 'vue'
import { diffFor, fileOfMedia, sync } from '~/utils/draft-marks'

/** A field's diff with the words and the previous photograph the chip shows. */
const decorate = (vm, diff) => {
  if (!diff || !diff.relationship) return diff
  return {
    ...diff,
    words: { replaced: vm.$t('draft.replaced'), was: vm.$t('draft.was') },
    previousImage: fileOfMedia(
      vm.$store,
      diff.previous,
      (vm.$config || {}).baseUrl || ''
    ),
  }
}

/**
 * Marks a draft's changes in the page, word by word, where the editor asked
 * for them: every field wrapper the View displays render, and a title a
 * template renders itself (`v-draft-diff="'title'"`).
 */

/** The entity a field wrapper renders: the nearest DruxtEntity above it. */
const entityOf = (vm) => {
  for (let p = vm.$parent; p; p = p.$parent) {
    if (p.$options.name === 'DruxtEntity' && p.uuid && p.type) {
      return { type: p.type, id: p.uuid }
    }
  }
  return null
}

/** A DruxtField wrapper on a View display: it knows its field, and its parents its entity. */
const isViewField = (vm) =>
  !!(
    vm.schema &&
    vm.schema.id &&
    (vm.schema.config || {}).schemaType === 'view' &&
    entityOf(vm)
  )

export default () => {
  Vue.mixin({
    computed: {
      umamiDraftMark() {
        return isViewField(this)
          ? decorate(
              this,
              diffFor(this.$store, this.$drafts, entityOf(this), this.schema.id)
            )
          : null
      },
    },
    watch: {
      umamiDraftMark() {
        this.$nextTick(() => sync(this.$el, this.umamiDraftMark))
      },
    },
    mounted() {
      sync(this.$el, this.umamiDraftMark)
    },
    updated() {
      sync(this.$el, this.umamiDraftMark)
    },
  })

  const forElement = (binding, vnode) => {
    const vm = vnode.context
    return vm && vm.entity
      ? decorate(vm, diffFor(vm.$store, vm.$drafts, vm.entity, binding.value))
      : null
  }
  // The binding is a field name, so it never changes: the element watches
  // the draft and the switches itself, and re-marks after a re-render.
  Vue.directive('draft-diff', {
    bind(el, binding, vnode) {
      const vm = vnode.context
      el.__umamiUnwatch = vm.$watch(
        () => forElement(binding, vnode),
        (diff) => vm.$nextTick(() => sync(el, diff)),
        { immediate: true }
      )
    },
    componentUpdated(el, binding, vnode) {
      sync(el, forElement(binding, vnode))
    },
    unbind(el) {
      if (el.__umamiUnwatch) el.__umamiUnwatch()
      sync(el, null)
    },
  })
}

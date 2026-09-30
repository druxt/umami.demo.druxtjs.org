import Vue from 'vue'
import { diffFor, sync } from '~/utils/draft-marks'

/**
 * Marks a draft's changes in the page, word by word, where the editor asked
 * for them: every field wrapper the View displays render, and a title a
 * template renders itself (`v-draft-diff="'title'"`).
 */

/** A DruxtField wrapper on a View display: it knows its entity and field. */
const isViewField = (vm) =>
  !!(
    vm.schema &&
    vm.schema.id &&
    vm.entity &&
    (vm.schema.config || {}).schemaType === 'view'
  )

export default () => {
  Vue.mixin({
    computed: {
      umamiDraftMark() {
        return isViewField(this)
          ? diffFor(this.$store, this.$drafts, this.entity, this.schema.id)
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
      ? diffFor(vm.$store, vm.$drafts, vm.entity, binding.value)
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

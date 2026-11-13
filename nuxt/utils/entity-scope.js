/**
 * Renders a field's slot with the entity it belongs to as its parent.
 *
 * A DruxtField names the entity in the key its fetched data is kept under,
 * and finds it on its parent or its parent's parent. A field passed into an
 * Umami component's slot is created inside that component, deeper than that,
 * so the key loses the entity and fields of the same name share one: on a
 * recipe, the edit form's photograph field took the page's data and rendered
 * the view's component instead of its widget. Wrapped in this, the field's
 * parent holds the entity again.
 *
 * Renders no element of its own when the slot is one element.
 */
export default {
  name: 'EntityScope',
  inheritAttrs: false,
  props: {
    entity: { type: Object, required: true },
  },
  render(h) {
    const nodes = (this.$slots.default || []).filter(
      (node) => node.tag || (node.text || '').trim()
    )
    if (nodes.length === 1) {
      return nodes[0]
    }
    return nodes.length ? h('div', nodes) : h()
  },
}

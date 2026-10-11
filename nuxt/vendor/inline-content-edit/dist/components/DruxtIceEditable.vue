<template>
  <div v-bind="anchors" class="druxt-ice-editable">
    <slot />
    <div
      v-if="showAffordance"
      data-testid="value"
      class="druxt-ice-editable__value"
      contenteditable="true"
      @blur="onBlur"
    >
      {{ value }}
    </div>
  </div>
</template>

<script>

// siroc builds this component to dist/components, standalone from the
// bundled dist/index.*.js. A relative import out of that directory has
// nothing beside it to resolve. The package name is the only specifier that
// reaches the module from both the source tree and the built output.
import {
  entityAnchors,
  fieldAnchors,
  adapterSupports,
} from '@druxt-contrib/inline-content-edit'

/**
 * Wraps a rendered field with its anchors, and an inline edit affordance
 * when the store, the adapter and the site all agree it may appear.
 *
 * The field attribute carries the JSON:API public field name, the key as it
 * appears in the fetched document, never an internal machine name. A site
 * can alias a field, and the diff payload this anchors against keys on the
 * public name. The entity attribute carries `data.id` unmodified. Neither
 * value is derived, transformed or normalised.
 *
 * `editing` comes from the `druxtIce` store, which may not exist at all on
 * a static render with no backend. Read only once mounted, the same as
 * `DruxtIceStatus`, so the first client render matches the server's and
 * hydration does not pair the wrong nodes.
 */
export default {
  name: 'DruxtIceEditable',

  props: {
    type: { type: String, required: true },
    id: { type: String, required: true },
    field: { type: String, required: true },
    delta: { type: Number, default: null },
    resource: { type: Object, default: null },
    adapter: { type: Object, default: null },
  },

  data() {
    return { hydrated: false }
  },

  computed: {
    anchors() {
      return {
        ...entityAnchors(this.type, this.id),
        ...fieldAnchors(this.field, this.delta),
      }
    },

    /** Guards rendering, not reading: false until mounted, store or not. */
    editing() {
      if (!this.hydrated || !this.$store) return false
      return Boolean(this.$store.getters['druxtIce/editing'])
    },

    /** The `{ type, id, resource, store }` shape every adapter method takes. */
    context() {
      return {
        type: this.type,
        id: this.id,
        resource: this.resource,
        store: this.$store,
      }
    },

    showAffordance() {
      if (!this.editing) return false
      if (!this.adapter) return false
      if (
        !adapterSupports(this.adapter, ['editableFields', 'stageFieldValue'])
      ) {
        return false
      }
      const fields = this.adapter.editableFields(this.context) || []
      return fields.includes(this.field)
    },

    value() {
      if (!this.showAffordance) return ''
      // Not part of the guard above: `fieldValue` is not one of the two
      // methods this affordance requires, so a call is still guarded here.
      if (typeof this.adapter.fieldValue !== 'function') return ''
      return this.adapter.fieldValue(this.context, this.field)
    },
  },

  mounted() {
    this.hydrated = true
  },

  methods: {
    onBlur(event) {
      this.adapter.stageFieldValue(
        this.context,
        this.field,
        event.target.textContent
      )
    },
  },
}
</script>

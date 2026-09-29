<template>
  <AppFormField
    :description="description"
    :feedback="feedback"
    :label="label"
    :required="required"
  >
    <!-- A small vocabulary as a segmented choice: every term the field can
         point at, the chosen ones filled. -->
    <div class="edit-segments" role="group" :aria-label="label">
      <span v-if="$fetchState.pending" class="edit-field__description">
        Loading…
      </span>
      <template v-else>
        <button
          v-for="o of options"
          :key="o.value"
          :aria-pressed="String(chosen.includes(o.value))"
          class="edit-segments__option"
          :class="{ 'is-on': chosen.includes(o.value) }"
          type="button"
          @click="pick(o)"
        >
          {{ o.label }}
        </button>
      </template>
    </div>
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'
import {
  allowedOptions,
  entityOptions,
  referenceItems,
  referenceTypes,
  relationship,
} from '~/utils/form-widgets'

export default {
  mixins: [formField],

  data: () => ({ entities: [] }),

  /** A reference lists what it can point at: each target bundle's terms. */
  async fetch() {
    if (!this.relationship) {
      return
    }
    const collections = await Promise.all(
      referenceTypes(this.schema).map((type) =>
        this.$store
          .dispatch('druxt/getCollection', {
            type,
            query: { [`fields[${type}]`]: 'name', sort: 'name' },
          })
          .catch(() => null)
      )
    )
    this.entities = collections.flatMap((c) => (c || {}).data || [])
  },

  computed: {
    options: ({ entities, schema }) =>
      entities.length ? entityOptions(entities) : allowedOptions(schema),

    chosen: ({ relationship, value }) =>
      relationship
        ? referenceItems(value).map((o) => o.id)
        : [].concat(value == null ? [] : value).map(String),
  },

  methods: {
    pick(o) {
      const on = this.chosen.includes(o.value)
      if (this.relationship) {
        const kept = referenceItems(this.value).filter((r) => r.id !== o.value)
        const items = on
          ? kept
          : this.multiple
          ? [...kept, { type: o.type, id: o.value }]
          : [{ type: o.type, id: o.value }]
        return this.$emit('input', relationship(items, this.multiple))
      }
      const kept = this.chosen.filter((v) => v !== o.value)
      const values = on ? kept : this.multiple ? [...kept, o.value] : [o.value]
      this.$emit('input', this.multiple ? values : values[0] || null)
    },
  },
}
</script>

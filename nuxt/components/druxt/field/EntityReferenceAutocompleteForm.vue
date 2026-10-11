<template>
  <AppFormField
    :description="description"
    :feedback="feedback"
    :label="label"
    :required="required"
    :target="id"
  >
    <!-- What is referenced, by name, and a search to change it. -->
    <div v-if="!changing" class="edit-control edit-control--reference">
      <span class="edit-control__avatar" aria-hidden="true" />
      <span>{{ name || '…' }}</span>
      <button
        class="edit-control__action"
        type="button"
        @click="changing = true"
      >
        {{ $t('form.change') }}
      </button>
    </div>
    <template v-else>
      <input
        :id="id"
        v-model="query"
        autocomplete="off"
        class="edit-control"
        :placeholder="`Search ${nouns}`"
        type="text"
        @input="search"
        @keydown.escape="changing = false"
      />
      <ul v-if="suggestions.length" class="edit-chips__list">
        <li v-for="o of suggestions" :key="o.id">
          <button type="button" @click="pick(o)">{{ labelOf(o) }}</button>
        </li>
      </ul>
    </template>
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'
import { langMixin } from '~/utils/lang'
import {
  matchSettings,
  referenceItems,
  relationship,
} from '~/utils/form-widgets'

const labelOf = (o) => {
  const a = o.attributes || {}
  return a.display_name || a.name || a.title || o.id
}

export default {
  mixins: [langMixin, formField],

  data: () => ({ name: '', changing: false, query: '', suggestions: [] }),

  computed: {
    items: ({ value }) => referenceItems(value),
    /** A base field like uid names no bundles; the value's own type does. */
    type: ({ items, schema }) =>
      (items[0] || {}).type ||
      `${(schema.settings.storage || {}).target_type}--${
        (schema.settings.storage || {}).target_type
      }`,
    nouns: ({ type }) => `${(type || '').split('--')[0]}s`,
  },

  watch: {
    items: {
      immediate: true,
      handler() {
        this.loadName()
      },
    },
  },

  methods: {
    labelOf,

    async loadName() {
      const [ref] = this.items
      if (!ref) return
      const r = await this.$store
        .dispatch('druxt/getResource', { type: ref.type, id: ref.id })
        .catch(() => null)
      this.name = r && r.data ? labelOf(r.data) : ''
    },

    async search() {
      const q = this.query.trim()
      if (q.length < 2) {
        this.suggestions = []
        return
      }
      const { operator, limit } = matchSettings(this.schema)
      const [entity, bundle] = this.type.split('--')
      const field = entity === 'user' ? 'name' : 'title'
      const params = new URLSearchParams({
        [`filter[${field}][operator]`]: operator,
        [`filter[${field}][value]`]: q,
        'page[limit]': String(limit),
      })
      try {
        const response = await this.$druxt.get(
          `${this.prefix}/jsonapi/${entity}/${bundle}?${params}`
        )
        if (this.query.trim() !== q) return
        this.suggestions = ((response || {}).data || {}).data || []
      } catch (e) {
        this.suggestions = []
      }
    },

    pick(o) {
      this.name = labelOf(o)
      this.changing = false
      this.query = ''
      this.suggestions = []
      this.$emit('input', relationship([{ type: o.type, id: o.id }], false))
    },
  },
}
</script>

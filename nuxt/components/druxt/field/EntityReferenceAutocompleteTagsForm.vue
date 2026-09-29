<template>
  <AppFormField
    :description="description"
    :feedback="feedback"
    :label="label"
    :required="required"
    :target="id"
  >
    <!-- Chips for what is referenced, a search for the next one. -->
    <div
      class="edit-chips"
      :class="{ 'is-open': suggestions.length || canCreate }"
    >
      <span v-for="item of items" :key="item.id" class="edit-chips__chip">
        {{ names[item.id] || '…' }}
        <button
          class="edit-chips__remove"
          type="button"
          :aria-label="`Remove ${names[item.id] || 'tag'}`"
          @click="remove(item.id)"
        >
          ×
        </button>
      </span>
      <input
        :id="id"
        v-model="query"
        autocomplete="off"
        class="edit-chips__input"
        :placeholder="`Add ${noun}`"
        type="text"
        @input="search"
        @keydown.backspace="backspace"
        @keydown.enter.prevent="enter"
      />
    </div>
    <ul v-if="suggestions.length || canCreate" class="edit-chips__list">
      <li v-for="o of suggestions" :key="o.id">
        <button type="button" @click="add(o)">{{ o.attributes.name }}</button>
      </li>
      <li v-if="canCreate">
        <button class="is-create" type="button" @click="create">
          Create “{{ query.trim() }}”
        </button>
      </li>
    </ul>
    <p v-if="createError" class="edit-field__error">{{ createError }}</p>
  </AppFormField>
</template>

<script>
import formField from '~/utils/form-field'
import {
  matchSettings,
  referenceItems,
  referenceTypes,
  relationship,
} from '~/utils/form-widgets'

export default {
  mixins: [formField],

  data: () => ({
    names: {},
    query: '',
    suggestions: [],
    createError: '',
  }),

  /** The name of each referenced term. */
  async fetch() {
    const found = await Promise.all(
      this.items.map((ref) =>
        this.$store
          .dispatch('druxt/getResource', {
            type: ref.type,
            id: ref.id,
            query: { [`fields[${ref.type}]`]: 'name' },
          })
          .then(
            (r) => [ref.id, (((r || {}).data || {}).attributes || {}).name],
            () => [ref.id, null]
          )
      )
    )
    this.names = { ...this.names, ...Object.fromEntries(found) }
  },

  computed: {
    items: ({ value }) => referenceItems(value),
    type: ({ schema }) => referenceTypes(schema)[0],
    noun: ({ label }) => label.toLowerCase().replace(/s$/, ''),
    autoCreate: ({ schema }) =>
      !!((schema.settings.config || {}).handler_settings || {}).auto_create,
    canCreate() {
      const q = this.query.trim().toLowerCase()
      return (
        this.autoCreate &&
        q.length > 1 &&
        !this.suggestions.some((o) => o.attributes.name.toLowerCase() === q) &&
        !Object.values(this.names).some((n) => (n || '').toLowerCase() === q)
      )
    },
  },

  methods: {
    /** The vocabulary, filtered the way the field is configured to match. */
    async search() {
      const q = this.query.trim()
      if (q.length < 2 || !this.type) {
        this.suggestions = []
        return
      }
      const { operator, limit } = matchSettings(this.schema)
      const [entity, bundle] = this.type.split('--')
      const params = new URLSearchParams({
        'filter[name][operator]': operator,
        'filter[name][value]': q,
        'page[limit]': String(limit),
        [`fields[${this.type}]`]: 'name',
        sort: 'name',
      })
      const url = `/en/jsonapi/${entity}/${bundle}?${params}`
      try {
        const response = await this.$druxt.get(url)
        if (this.query.trim() !== q) return
        const taken = this.items.map((o) => o.id)
        this.suggestions = ((response || {}).data || {}).data
          ? response.data.data.filter((o) => !taken.includes(o.id))
          : (response.data || []).filter((o) => !taken.includes(o.id))
      } catch (e) {
        this.suggestions = []
      }
    },

    add(term) {
      this.names = { ...this.names, [term.id]: term.attributes.name }
      this.$emit(
        'input',
        relationship([...this.items, { type: term.type, id: term.id }], true)
      )
      this.query = ''
      this.suggestions = []
    },

    remove(id) {
      this.$emit(
        'input',
        relationship(
          this.items.filter((o) => o.id !== id),
          true
        )
      )
    },

    enter() {
      if (this.suggestions.length) return this.add(this.suggestions[0])
      if (this.canCreate) return this.create()
    },

    backspace() {
      if (!this.query && this.items.length) {
        this.remove(this.items[this.items.length - 1].id)
      }
    },

    /** A new term is created before the recipe is saved, and it says so. */
    async create() {
      this.createError = ''
      try {
        const created = await this.$druxt.createResource({
          type: this.type,
          attributes: { name: this.query.trim() },
        })
        const term = (created || {}).data || created
        if (!term || !term.id) throw new Error('not created')
        this.add(term)
      } catch (e) {
        this.createError = `“${this.query.trim()}” could not be created. Sign in with an account that may add ${
          this.noun
        }s.`
      }
    },
  },
}
</script>

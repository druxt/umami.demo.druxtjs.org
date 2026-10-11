<template>
  <!-- Behind the curtain: the operations Drupal offers this editor on the
       node, from druxt-admin, opening Drupal's own screens on this origin,
       where the session opened at sign-in has them signed in already. -->
  <DruxtAdminOperations
    v-slot="{ operations: offered, open, toggle, close, active, run }"
    class="drupal-links"
    :label="label"
    :operations="operations"
  >
    <div v-click-outside="close" class="drupal-links__menu">
      <button
        :aria-expanded="String(open)"
        aria-haspopup="menu"
        class="drupal-links__toggle"
        type="button"
        @click="toggle()"
      >
        {{ $t('drupal.menu') }} <span aria-hidden="true">▾</span>
      </button>
      <ul v-if="open" class="drupal-links__list" role="menu">
        <li
          v-for="(operation, index) of offered"
          :key="operation.key"
          role="none"
        >
          <a
            v-focus-when="active === index"
            class="drupal-links__item"
            :class="{
              'drupal-links__item--destructive': operation.destructive,
            }"
            :href="operation.href"
            role="menuitem"
            @click="run(operation, $event)"
          >
            {{ titleOf(operation) }}
          </a>
        </li>
      </ul>
    </div>
  </DruxtAdminOperations>
</template>

<script>
// The library, not the package index: that carries the proxy, and Node's
// http with it, into the reader's bundle.
import { operationsFromLinks } from '@druxt-contrib/admin/dist/lib/operations.mjs'

/**
 * The links Drupal publishes for the operations an editor may use, in menu
 * order. druxt_umami's link provider publishes the translation overview as
 * `drupal-content-translation-overview`: a JSON:API member name holds no colon.
 */
const OPERATIONS = [
  'edit-form',
  'version-history',
  'drupal-content-translation-overview',
  'delete-form',
]

export default {
  directives: {
    /** Focus follows the menu's active item, as its keys move it. */
    focusWhen: {
      update(el, { value, oldValue }) {
        if (value && !oldValue) el.focus()
      },
    },
    /** A click anywhere else closes the menu. */
    clickOutside: {
      bind(el, { value }) {
        el.__outside = (event) => !el.contains(event.target) && value()
        document.addEventListener('click', el.__outside)
      },
      unbind(el) {
        document.removeEventListener('click', el.__outside)
      },
    },
  },

  props: {
    /** The resource: `node--recipe` and its UUID. */
    type: { type: String, required: true },
    uuid: { type: String, required: true },
    /** The translation shown: its operations are the ones offered. */
    langcode: { type: String, default: 'en' },
    /** What the operations act on, for the labels a reader hears. */
    label: { type: String, default: '' },
  },

  data: () => ({ operations: [] }),

  watch: {
    langcode: 'load',
    uuid: 'load',
  },

  mounted() {
    this.load()
  },

  methods: {
    /** Drupal says what this editor may do; a reader is sent nothing. */
    async load() {
      const token = this.$auth && this.$auth.strategy.token.get()
      if (!token) return (this.operations = [])
      try {
        const path = `/${this.langcode}/jsonapi/${this.type.replace(
          '--',
          '/'
        )}/${this.uuid}`
        const response = await fetch(`${path}?fields[${this.type}]=`, {
          headers: { Accept: 'application/vnd.api+json', Authorization: token },
        })
        if (!response.ok) return (this.operations = [])
        const { data } = await response.json()
        this.operations = operationsFromLinks(data, { operations: OPERATIONS })
      } catch (e) {
        // An editor's convenience, never a reason for the page to break.
        this.operations = []
      }
    },

    titleOf(operation) {
      const key = `drupal.${operation.key}`
      return this.$te(key) ? this.$t(key) : operation.title
    },
  },
}
</script>

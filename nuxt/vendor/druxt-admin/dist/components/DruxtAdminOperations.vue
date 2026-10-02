<template>
  <!--
    Nothing without operations: a reader Drupal offers nothing is a reader
    this renders nothing for, not an empty menu with a button that opens it.
  -->
  <div
    v-if="operations.length"
    class="druxt-admin-operations"
    data-testid="druxt-admin-operations"
    @keydown="onKeydown"
  >
    <!--
      The whole menu, for a site that has its own. Everything it needs is
      here: what Drupal offers, whether the menu is open, and the way to move
      through it. The default below is a plain list, because a module that
      ships a designed menu is a module every site has to undo.
    -->
    <slot
      :operations="operations"
      :open="open"
      :toggle="toggle"
      :close="close"
      :active="active"
      :activate="activate"
      :run="run"
    >
      <button
        type="button"
        class="druxt-admin-operations__toggle"
        :aria-expanded="String(open)"
        aria-haspopup="menu"
        data-testid="druxt-admin-operations-toggle"
        @click="toggle()"
      >
        {{ toggleText }}
      </button>

      <ul v-if="open" class="druxt-admin-operations__list" role="menu">
        <li
          v-for="(operation, index) of operations"
          :key="operation.key"
          role="none"
        >
          <a
            :ref="`item-${index}`"
            :href="operation.href"
            class="druxt-admin-operations__item"
            :class="{
              'druxt-admin-operations__item--destructive':
                operation.destructive,
            }"
            :data-operation="operation.key"
            :data-destructive="operation.destructive ? '' : null"
            role="menuitem"
            target="_self"
            @click="run(operation, $event)"
            @focus="active = index"
            >{{ operation.title }}</a
          >
        </li>
      </ul>
    </slot>
  </div>
</template>

<script>

// Not the package index: that carries the proxy, and importing it here puts
// Node's http into every reader's bundle. See AGENTS.md.
import {
  isDestructive,
  movementFor,
  moveTo,
  resolveKeys,
} from '../lib/operations'

/**
 * The operations Drupal offers on one entity, as a menu.
 *
 * What Drupal will let this user do is Drupal's decision, so the operations
 * are given to this component rather than guessed at: a site reads them from
 * its own source and passes them in, and `operationsFromLinks()` turns a
 * JSON:API resource's links into the list where that is the source.
 *
 * The default render is a button and a list of links, deliberately plain. A
 * site that wants its own menu fills the default slot and gets the state and
 * the movements as slot props, so it writes markup rather than behaviour.
 */
export default {
  name: 'DruxtAdminOperations',

  props: {
    /**
     * The operations: `{ key, title, href, destructive }` each.
     */
    operations: {
      type: Array,
      default: () => [],
    },

    /**
     * What the operations act on, for the labels a reader hears.
     */
    label: {
      type: String,
      default: 'this item',
    },

    /**
     * The keys that walk the menu: `false` for none, `true` for the defaults,
     * or a map of the movements to change. A submenu that opens to the right
     * wants `{ into: 'ArrowRight', out: 'ArrowLeft' }`.
     */
    keyboard: {
      type: [Boolean, Object],
      default: true,
    },

    /**
     * Whether the default render asks before running a destructive operation.
     * A site with its own confirmation turns this off, or replaces the slot.
     */
    confirm: {
      type: Boolean,
      default: true,
    },
  },

  data: () => ({ open: false, active: -1 }),

  computed: {
    keys() {
      return resolveKeys(this.keyboard)
    },

    toggleText() {
      return `Operations for ${this.label}`
    },
  },

  methods: {
    isDestructive(operation) {
      return isDestructive(operation) || Boolean((operation || {}).destructive)
    },

    /** Opens or closes the menu, and says so. */
    toggle(to) {
      const next = to === undefined ? !this.open : Boolean(to)
      if (next === this.open) return
      this.open = next
      this.active = -1
      this.$emit(next ? 'open' : 'close')
    },

    close() {
      this.toggle(false)
    },

    /** Moves to an operation by index, and focuses it in the default render. */
    activate(index) {
      this.active = index
      const item = (this.$refs[`item-${index}`] || [])[0]
      if (item && item.focus) item.focus()
    },

    /**
     * Runs an operation. A destructive one asks first, unless the site turned
     * that off, and a refusal leaves the page where it is.
     *
     * @param {object} operation - The operation.
     * @param {Event} [event] - The event that ran it, to stop where refused.
     */
    run(operation, event) {
      if (
        this.confirm &&
        this.isDestructive(operation) &&
        !this.confirmed(operation)
      ) {
        if (event) event.preventDefault()
        return false
      }
      this.$emit('run', operation)
      return true
    },

    /** Asked as a question, so a site can answer it another way. */
    confirmed(operation) {
      if (typeof window === 'undefined' || !window.confirm) return true
      return window.confirm(
        `${operation.title} ${this.label}? This cannot be undone.`
      )
    },

    /**
     * The keys, where the site kept them: up and down through the
     * operations, `close` to shut the menu, and `into` and `out` for a
     * submenu, which this emits rather than implements.
     */
    onKeydown(event) {
      const movement = movementFor(this.keys, event.key)
      if (!movement) return
      if (movement === 'close') {
        if (!this.open) return
        event.preventDefault()
        this.close()
        return
      }
      if (movement === 'into' || movement === 'out') {
        this.$emit(movement, {
          index: this.active,
          operation: this.operations[this.active],
        })
        return
      }
      if (!this.open) return
      event.preventDefault()
      this.activate(
        moveTo(
          this.active,
          movement === 'next' ? 1 : -1,
          this.operations.length
        )
      )
    },
  },
}
</script>

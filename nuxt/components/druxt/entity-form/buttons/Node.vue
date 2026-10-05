<template>
  <div class="edit-actions">
    <template v-if="signedIn">
      <b-button
        class="edit-actions__save"
        :disabled="!changes"
        type="submit"
        variant="primary"
        @click.prevent="$parent.$emit('submit')"
      >
        {{
          changes
            ? `Save · ${changes} change${changes === 1 ? '' : 's'}`
            : 'Save changes'
        }}
      </b-button>
      <b-button
        class="edit-actions__cancel"
        :disabled="!changes"
        type="button"
        variant="outline-secondary"
        @click="$parent.$emit('reset')"
      >
        Cancel
      </b-button>
    </template>

    <!-- Anonymous visitors see the form and this in place of the buttons. -->
    <p v-else class="edit-actions__signin">
      <nuxt-link to="/login">Sign in</nuxt-link> to save changes. Nothing is
      written until Drupal says who you are.
    </p>
  </div>
</template>

<script>
/**
 * Save counts the fields that differ from the entity in the store and is off
 * until there is one; Cancel puts the entity back.
 */
export default {
  computed: {
    /** The DruxtEntityForm these buttons belong to. */
    form() {
      let vm = this.$parent
      while (vm && !(vm.model && vm.entity && vm.onSubmit)) vm = vm.$parent
      return vm
    },

    changes() {
      const form = this.form
      if (!form) return 0
      let count = 0
      for (const type of ['attributes', 'relationships']) {
        const was = (form.entity || {})[type] || {}
        const now = (form.model || {})[type] || {}
        for (const key of new Set([...Object.keys(was), ...Object.keys(now)])) {
          if (JSON.stringify(was[key]) !== JSON.stringify(now[key])) count++
        }
      }
      return count
    },

    signedIn: ({ $auth }) => !!($auth && $auth.loggedIn),
  },
}
</script>

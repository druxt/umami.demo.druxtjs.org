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
        @click="cancel"
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
 * Save counts the fields that differ from the entity as it was when the
 * form opened, and is off until there is one; Cancel puts that back.
 *
 * DruxtEntityForm's `entity` is a view of its `model`, so the pristine copy
 * has to be kept here, and it moves on after a save goes through.
 */
export default {
  data: () => ({
    pristine: '',
  }),

  computed: {
    /** The DruxtEntityForm these buttons belong to. */
    form() {
      let vm = this.$parent
      while (vm && !(vm.model && vm.entity && vm.onSubmit)) vm = vm.$parent
      return vm
    },

    changes() {
      const form = this.form
      if (!form || !this.pristine) return 0
      const was = JSON.parse(this.pristine)
      let count = 0
      for (const type of ['attributes', 'relationships']) {
        const before = was[type] || {}
        const now = (form.model || {})[type] || {}
        for (const key of new Set([
          ...Object.keys(before),
          ...Object.keys(now),
        ])) {
          if (JSON.stringify(before[key]) !== JSON.stringify(now[key])) count++
        }
      }
      return count
    },

    signedIn: ({ $auth }) => !!($auth && $auth.loggedIn),
  },

  mounted() {
    this.snapshot()
    if (this.form) this.form.$on('submit', this.snapshot)
  },

  beforeDestroy() {
    if (this.form) this.form.$off('submit', this.snapshot)
  },

  methods: {
    snapshot() {
      this.pristine = this.form ? JSON.stringify(this.form.model) : ''
    },

    /** Back to the entity as the form found it. */
    cancel() {
      if (this.form && this.pristine) {
        this.form.model = JSON.parse(this.pristine)
      }
    },
  },
}
</script>

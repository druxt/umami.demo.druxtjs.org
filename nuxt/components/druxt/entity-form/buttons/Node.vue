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
            ? $tc('form.saveCount', changes, { n: changes })
            : $t('form.save')
        }}
      </b-button>
      <b-button
        class="edit-actions__cancel"
        :disabled="!changes"
        type="button"
        variant="outline-secondary"
        @click="cancel"
        >{{ $t('form.cancel') }}</b-button
      >
      <span v-if="changes" class="edit-actions__kept">{{
        $t('form.draftKept')
      }}</span>
    </template>

    <!-- Anonymous visitors see the form and this in place of the buttons. -->
    <p v-else class="edit-actions__signin">
      <AppAccountLink />
      {{ $t('form.signInToSave') }}
    </p>
  </div>
</template>

<script>
import { withoutDraft } from '~/utils/edit-drafts'

/**
 * Save counts the fields that differ from the entity as Drupal holds it, and
 * is off until there is one; Cancel puts that back.
 *
 * DruxtEntityForm's `entity` is a view of its `model`, so the pristine copy
 * has to be kept here, and it moves on after a save goes through. A form
 * that opens on a draft counts the draft's fields as changes.
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
    /** After a save the model is what Drupal holds; before one, the draft is not. */
    snapshot(saved) {
      const form = this.form
      if (!form) {
        this.pristine = ''
        return
      }
      const model = form.model
      const draft =
        this.$drafts && !saved
          ? this.$drafts.draftFor(
              model.type,
              model.id,
              (model.attributes || {}).langcode || 'en'
            )
          : null
      this.pristine = JSON.stringify(withoutDraft(model, draft))
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

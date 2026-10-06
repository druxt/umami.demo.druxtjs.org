import { draftOf, withoutDraft } from '~/utils/edit-drafts'

/**
 * What every node form shares: the form it belongs to, its errors, and the
 * draft. Every change to the model becomes the entity's draft, which the
 * page shows at once and the next visit finds again.
 */
export default {
  data: () => ({
    /** The entity as Drupal holds it, captured when the form loads. */
    original: null,
  }),

  computed: {
    /** The DruxtEntityForm this wrapper renders for. */
    form() {
      let vm = this.$parent
      while (vm && !(vm.model && vm.entity && vm.onSubmit)) vm = vm.$parent
      return vm
    },
    errors: ({ form }) => (form || {}).errors || [],
    submitting: ({ form }) => (form || {}).submitting,
    fieldLabels: ({ form }) =>
      Object.fromEntries(
        (((form || {}).schema || {}).fields || []).map((f) => [
          f.id,
          (f.label || {}).text || f.id,
        ])
      ),
  },

  mounted() {
    // The form has usually fetched by now, so the first model is captured
    // here; a deep watcher only reports the changes that follow.
    this.onModel((this.form || {}).model)
    this.$watch(() => (this.form || {}).model, this.onModel, { deep: true })
    if (this.form) this.form.$on('submit', this.onSaved)
  },

  beforeDestroy() {
    if (this.form) this.form.$off('submit', this.onSaved)
  },

  methods: {
    onModel(model) {
      if (!model || !model.id || !this.$drafts) return
      const key = `${model.type}:${model.id}`
      if (!this.original) {
        // The first model is the fetched entity, with any draft already laid
        // over it; the draft's before values give the entity Drupal holds.
        this.original = JSON.parse(
          JSON.stringify(
            withoutDraft(model, this.$drafts.draftFor(model.type, model.id))
          )
        )
        return
      }
      const draft = draftOf(this.original, model)
      if (draft) {
        this.$store.commit('druxtIce/setDraft', { key, draft })
      } else if (this.$drafts.draftFor(model.type, model.id)) {
        this.$store.commit('druxtIce/clearDraft', key)
      }
      this.$drafts.mirror(model)
    },

    /** Saved: what Drupal holds is the model now, and the draft is spent. */
    onSaved(resource) {
      const model = (this.form || {}).model
      if (!resource || !model) return
      this.original = JSON.parse(JSON.stringify(model))
      this.$store.commit(
        'druxtIce/clearDraft',
        `${resource.type}:${resource.id}`
      )
    },
  },
}

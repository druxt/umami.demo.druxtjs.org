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
    /** Room for the settings beside the content, rather than below it. */
    wide: false,
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
    this.$nuxt.$on('drafts:discarded', this.onDiscarded)
    // The settings drawer opens on its own once it has a column of its own.
    this.media = window.matchMedia('(min-width: 992px)')
    this.onMedia(this.media)
    this.media.addEventListener('change', this.onMedia)
  },

  beforeDestroy() {
    if (this.form) this.form.$off('submit', this.onSaved)
    this.$nuxt.$off('drafts:discarded', this.onDiscarded)
    if (this.media) this.media.removeEventListener('change', this.onMedia)
  },

  methods: {
    onMedia(media) {
      this.wide = !!media.matches
    },

    /** The page threw the draft away: the form shows Drupal's entity again. */
    onDiscarded(key) {
      const model = (this.form || {}).model
      if (!model || !this.original) return
      const langcode = (model.attributes || {}).langcode || 'en'
      if (key !== `${model.type}:${model.id}:${langcode}`) return
      this.form.model = JSON.parse(JSON.stringify(this.original))
    },

    onModel(model) {
      if (!model || !model.id || !this.$drafts) return
      const langcode = (model.attributes || {}).langcode || 'en'
      const key = `${model.type}:${model.id}:${langcode}`
      if (!this.original) {
        // The first model is the fetched entity, with any draft already laid
        // over it; the draft's before values give the entity Drupal holds.
        this.original = JSON.parse(
          JSON.stringify(
            withoutDraft(
              model,
              this.$drafts.draftFor(model.type, model.id, langcode)
            )
          )
        )
        return
      }
      const draft = draftOf(this.original, model)
      if (draft) {
        this.$store.commit('drafts/setDraft', { key, draft })
      } else if (this.$drafts.draftFor(model.type, model.id, langcode)) {
        this.$store.commit('drafts/clearDraft', key)
      }
      this.$drafts.mirror(model)
    },

    /** Saved: what Drupal holds is the model now, and the draft is spent. */
    onSaved(resource) {
      const model = (this.form || {}).model
      if (!resource || !model) return
      this.original = JSON.parse(JSON.stringify(model))
      this.$store.commit(
        'drafts/clearDraft',
        `${resource.type}:${resource.id}:${
          (model.attributes || {}).langcode || 'en'
        }`
      )
    },
  },
}

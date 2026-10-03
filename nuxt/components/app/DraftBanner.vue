<template>
  <!-- Above a page that shows an unsaved draft: says so, switches between
       the draft and Drupal's version, and marks the changes in the page. -->
  <div v-if="draft" class="draft-banner" role="status">
    <div class="draft-banner__row">
      <span class="draft-banner__kicker">{{
        real ? $t('draft.showingReal') : $t('draft.showingDraft')
      }}</span>
      <span class="draft-banner__text">{{ $t('draft.kept') }}</span>
      <span class="draft-banner__switch" role="group">
        <button
          class="draft-banner__option"
          :class="{ 'is-on': !real }"
          type="button"
          @click="show(false)"
        >
          {{ $t('draft.draft') }}
        </button>
        <button
          class="draft-banner__option"
          :class="{ 'is-on': real }"
          type="button"
          @click="show(true)"
        >
          {{ $t('draft.real') }}
        </button>
      </span>
      <button
        class="draft-banner__diff-toggle"
        :aria-pressed="String(marking)"
        :disabled="real"
        type="button"
        @click="mark(!marking)"
      >
        {{
          marking
            ? $t('draft.hideMarks')
            : $tc('draft.changes', changes, { n: changes })
        }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    type: { type: String, required: true },
    uuid: { type: String, required: true },
  },

  computed: {
    draft() {
      return ((this.$store.state.druxtIce || {}).drafts || {})[
        `${this.type}:${this.uuid}`
      ]
    },

    real() {
      return !!((this.$drafts || {}).real || { keys: {} }).keys[
        `${this.type}:${this.uuid}`
      ]
    },

    marking() {
      return !!((this.$drafts || {}).real || { marks: {} }).marks[
        `${this.type}:${this.uuid}`
      ]
    },

    /** How many fields the draft changes. */
    changes() {
      const draft = this.draft || {}
      return (
        Object.keys(draft.attributes || {}).length +
        Object.keys(draft.relationships || {}).length
      )
    },
  },

  methods: {
    show(real) {
      this.$drafts.showReal(this.type, this.uuid, real)
    },
    mark(on) {
      this.$drafts.showChanges(this.type, this.uuid, on)
    },
  },
}
</script>

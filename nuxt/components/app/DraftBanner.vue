<template>
  <!-- Above a page that shows an unsaved draft: says so, switches between
       the draft and Drupal's version, and lists what changed. -->
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
        :aria-expanded="String(open)"
        type="button"
        @click="open = !open"
      >
        {{
          $tc('draft.changes', diff.fields.length, { n: diff.fields.length })
        }}
      </button>
    </div>

    <dl v-if="open" class="draft-banner__diff">
      <template v-for="field of diff.fields">
        <dt :key="`${field.label}-name`">
          <code>{{ field.label }}</code>
          <span class="draft-banner__status" :class="`is-${field.status}`">{{
            $t(`draft.${field.status}`)
          }}</span>
        </dt>
        <dd :key="`${field.label}-value`">
          <template v-if="field.words">
            <del v-if="field.words.removed">{{ field.words.removed }}</del>
            <ins v-if="field.words.added">{{ field.words.added }}</ins>
          </template>
          <template v-else>
            <del v-if="field.left">{{ field.left }}</del>
            <ins v-if="field.right">{{ field.right }}</ins>
          </template>
        </dd>
      </template>
    </dl>
  </div>
</template>

<script>
import { diffOf, withoutDraft } from '~/utils/edit-drafts'

export default {
  props: {
    type: { type: String, required: true },
    uuid: { type: String, required: true },
  },

  data: () => ({ open: false }),

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

    /** The entity as Drupal holds it: the store copy with the draft undone. */
    original() {
      const byPrefix =
        ((this.$store.state.druxt || {}).resources || {})[this.type] || {}
      const doc = Object.values(byPrefix[this.uuid] || {}).find(
        (o) => o && o.data
      )
      const data = (doc || {}).data || { type: this.type, id: this.uuid }
      return this.real ? data : withoutDraft(data, this.draft)
    },

    diff() {
      return diffOf(this.original, this.draft)
    },
  },

  methods: {
    show(real) {
      this.$drafts.showReal(this.type, this.uuid, real)
    },
  },
}
</script>

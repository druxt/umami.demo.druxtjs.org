<template>
  <!-- Above a page that shows an unsaved draft: says so, switches between
       the draft and Drupal's version, and marks the changes in the page. -->
  <div v-if="draft" class="draft-banner" role="status">
    <div class="draft-banner__row">
      <span class="draft-banner__kicker">{{
        real ? $t('draft.showingReal') : $t('draft.showingDraft')
      }}</span>
      <span class="draft-banner__text">{{
        real ? $t('draft.keptReal') : $t('draft.kept')
      }}</span>
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

    <!-- A removed field renders nothing, so the page has nowhere to mark
         it: the banner shows what went, and what it was. -->
    <ul v-if="marking && removed.length" class="draft-banner__removed">
      <li v-for="item of removed" :key="item.name">
        <span class="draft-banner__removed-name">{{ item.label }}</span>
        <ins class="v-diff-ins">{{ $t('draft.removed') }}</ins>
        <del class="v-diff-del">
          <img v-if="item.image" alt="" :src="item.image" />
          <template v-else>{{ item.text }}</template>
        </del>
      </li>
    </ul>
  </div>
</template>

<script>
import { fileOfMedia, plain } from '~/utils/draft-diff'
import { langMixin } from '~/utils/lang'

/** A field name as a word or two: `field_media_image` is "media image". */
const labelOf = (name) =>
  String(name)
    .replace(/^field_/, '')
    .replace(/_/g, ' ')

const isEmpty = (value) =>
  value == null ||
  value === '' ||
  (Array.isArray(value) && !value.length) ||
  (typeof value === 'object' &&
    'data' in value &&
    (value.data == null || (Array.isArray(value.data) && !value.data.length)))

export default {
  mixins: [langMixin],

  props: {
    type: { type: String, required: true },
    uuid: { type: String, required: true },
  },

  computed: {
    draft() {
      return ((this.$store.state.drafts || {}).drafts || {})[
        `${this.type}:${this.uuid}:${this.lang}`
      ]
    },

    real() {
      return !!((this.$drafts || {}).real || { keys: {} }).keys[
        `${this.type}:${this.uuid}:${this.lang}`
      ]
    },

    marking() {
      return !!((this.$drafts || {}).real || { marks: {} }).marks[
        `${this.type}:${this.uuid}:${this.lang}`
      ]
    },

    /** The fields the draft empties, each with what it held. */
    removed() {
      const draft = this.draft || {}
      const before = draft.before || {}
      const out = []
      for (const [name, value] of Object.entries(draft.relationships || {})) {
        if (!isEmpty(value) || isEmpty((before.relationships || {})[name])) {
          continue
        }
        out.push({
          name,
          label: labelOf(name),
          image: fileOfMedia(
            this.$store,
            before.relationships[name],
            (this.$config || {}).baseUrl || ''
          ),
          text: '',
        })
      }
      for (const [name, value] of Object.entries(draft.attributes || {})) {
        if (!isEmpty(value) || isEmpty((before.attributes || {})[name])) {
          continue
        }
        out.push({
          name,
          label: labelOf(name),
          image: null,
          text: plain(before.attributes[name]).slice(0, 160),
        })
      }
      return out
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
      this.$drafts.showReal(this.type, this.uuid, this.lang, real)
    },
    mark(on) {
      this.$drafts.showChanges(this.type, this.uuid, this.lang, on)
    },
  },
}
</script>

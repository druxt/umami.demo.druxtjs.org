<template>
  <!-- A replaced relationship has no words to mark: the chip says what it
       was, with the photograph where there is one. -->
  <span v-if="field" class="v-diff-swap">
    <del class="v-diff-del">
      {{ $t('draft.was') }}
      <img v-if="image" alt="" :src="image" />
    </del>
    <ins class="v-diff-ins">{{ $t('draft.replaced') }}</ins>
  </span>
</template>

<script>
import { fileOfMedia, previousOf } from '~/utils/draft-diff'

export default {
  props: {
    /** The field's diff from `fieldDiff()`; nothing renders without one. */
    field: { type: Object, default: null },
    /** The entity the field belongs to: `{ type, id, langcode }`. */
    entity: { type: Object, required: true },
    /** The relationship's name. */
    name: { type: String, required: true },
  },

  computed: {
    image() {
      return fileOfMedia(
        this.$store,
        previousOf(this.$drafts, this.entity, this.name),
        (this.$config || {}).baseUrl || ''
      )
    },
  },
}
</script>

<template>
  <component :is="wrapper.component" v-bind="wrapper.props">
    <!-- Label: Above -->
    <div v-if="$scopedSlots['label-above']">
      <slot name="label-above" />
    </div>

    <!-- Label: Inline -->
    <slot v-if="$scopedSlots['label-inline']" name="label-inline" />

    <!-- Items -->
    <DruxtEntity
      v-for="item of items"
      :key="item.uuid"
      class="d-inline-block"
      v-bind="{ ...item, mode: 'label' }"
    >
      <template #default="{ entity }">
        <!-- The formatter's "Link label to the referenced entity" setting. -->
        <NuxtLink
          v-if="linked"
          class="mr-1"
          :to="`${prefix}${(entity.attributes.path || {}).alias}`"
        >
          <b-badge variant="info">{{ entity.attributes.name }}</b-badge>
        </NuxtLink>
        <b-badge v-else class="mr-1" variant="info">
          {{ entity.attributes.name }}
        </b-badge>
      </template>
    </DruxtEntity>
  </component>
</template>

<script>
import { DruxtFieldMixin } from 'druxt-entity'
import { langMixin } from '~/utils/lang'
import { draftDiffable } from '~/utils/draft-diff'

export default {
  mixins: [draftDiffable, langMixin, DruxtFieldMixin],

  computed: {
    /** Saved, the setting is a boolean; unsaved in a preview, 0 or 1. */
    linked: ({ schema }) => {
      const { link } = (schema.settings || {}).display || {}
      return link === undefined || !!Number(link)
    },
  },
}
</script>

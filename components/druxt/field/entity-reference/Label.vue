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
        <NuxtLink class="mr-1" :to="`/en${entity.attributes.path.alias}`">
          <b-badge variant="info">{{ entity.attributes.name }}</b-badge>
        </NuxtLink>
      </template>
    </DruxtEntity>
  </component>
</template>

<script>
import { DruxtFieldMixin } from 'druxt-entity'

export default {
  mixins: [DruxtFieldMixin],
}
</script>

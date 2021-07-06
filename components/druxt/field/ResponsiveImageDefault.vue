<template>
  <component
    :is="wrapper.component"
    v-bind="wrapper.props"
    v-if="!$fetchState.pending"
  >
    <!-- Label: Above -->
    <div v-if="$scopedSlots['label-above']">
      <slot name="label-above" />
    </div>

    <!-- Label: Inline -->
    <slot v-if="$scopedSlots['label-inline']" name="label-inline" />

    <!-- Items -->
    <b-card-img-lazy
      v-for="entity of entities"
      :key="entity.data.id"
      :src="
        $config.baseUrl +
        entity.data.attributes.uri.value.replace(
          'public://',
          '/sites/default/files/'
        )
      "
    />
  </component>
</template>

<script>
import { DrupalJsonApiParams } from 'drupal-jsonapi-params'
import { DruxtFieldResponsiveImage } from 'druxt-entity'

export default {
  extends: DruxtFieldResponsiveImage,

  async fetch() {
    this.entities = await Promise.all(
      this.items.map(({ type, uuid }) =>
        this.getResource({
          id: uuid,
          type,
          query: new DrupalJsonApiParams().addFields(type, ['uri']),
        })
      )
    )
  },

  fetchKey(getCounter) {
    const parts = [
      'ResponsiveImage',
      this.schema.id,
      this.value.data.type,
      this.value.data.id,
    ].filter((o) => o)
    return [...parts, getCounter(parts.join(':'))].join(':')
  },
}
</script>

<style scoped>
img {
  width: 100%;
}
</style>

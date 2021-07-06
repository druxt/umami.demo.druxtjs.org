<template>
  <component :is="wrapper.component" v-if="!$fetchState.pending">
    <!-- Label: Above -->
    <div v-if="$scopedSlots['label-above']">
      <slot name="label-above" />
    </div>

    <!-- Label: Inline -->
    <slot v-if="$scopedSlots['label-inline']" name="label-inline" />

    <!-- Items -->
    <component
      :is="component"
      v-for="(entity, key) of entities"
      :key="key"
      class="mr-1"
      v-bind="entity.props || false"
    >
      <b-badge variant="info">{{ entity.text }}</b-badge>
    </component>
  </component>
</template>

<script>
import { DrupalJsonApiParams } from 'drupal-jsonapi-params'
import { DruxtFieldEntityReferenceLabel } from 'druxt-entity'

export default {
  extends: DruxtFieldEntityReferenceLabel,

  async fetch() {
    for (const delta in this.items) {
      const item = this.items[delta]

      const result = await this.getResource({
        id: item.uuid,
        type: item.type,
        query: new DrupalJsonApiParams().addFields(item.type, ['name', 'path']),
      })
      if (!this.entities) this.entities = []

      this.entities[delta] = {
        props: false,
        text: result.data.attributes.name,
      }

      if (
        ((this.schema.settings || {}).display || {}).link &&
        result.data.attributes.path.alias
      ) {
        this.component = 'nuxt-link'
        /* @todo - Implement proper multilingual support */
        this.entities[delta].props = {
          to: `/en${result.data.attributes.path.alias}`,
        }
      }
    }
  },
}
</script>

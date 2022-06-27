<template>
  <div>
    <h2 v-text="settings.label" />

    <DruxtMenu component="span" name="footer" class="ml-auto">
      <template #item="{ item: { entity }, to }">
        <b-button
          v-if="entity.id === 'contact.site_page'"
          :to="to"
          variant="primary"
        >
          {{ entity.attributes.title }}
        </b-button>
      </template>
    </DruxtMenu>
  </div>
</template>

<script>
import { DruxtBlocksBlockMixin } from 'druxt-blocks'

export default {
  mixins: [DruxtBlocksBlockMixin],
}
</script>

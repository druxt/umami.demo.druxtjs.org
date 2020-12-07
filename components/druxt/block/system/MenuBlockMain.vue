<template>
  <druxt-menu component="b-navbar-nav" class="ml-auto">
    <template #item="{ item: { entity }, to }">
      <b-nav-item :to="to">
        {{ entity.attributes.title }}
      </b-nav-item>
    </template>

    <template #parent="{ item: { entity, children } }">
      <b-nav-item-dropdown :text="entity.attributes.title">
        <druxt-menu-item :item="{ entity, children: [] }" />

        <druxt-menu-item
          v-for="item in children"
          :key="item.entity.id"
          :item="item"
        />
      </b-nav-item-dropdown>
    </template>
  </druxt-menu>
</template>

<script>
import { DruxtBlocksBlockMixin } from 'druxt-blocks'

export default {
  mixins: [DruxtBlocksBlockMixin],
}
</script>

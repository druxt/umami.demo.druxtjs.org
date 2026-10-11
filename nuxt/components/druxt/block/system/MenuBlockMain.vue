<template>
  <druxt-menu component="b-navbar-nav" class="masthead__menu">
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

<style>
.masthead__menu {
  align-items: center;
  display: flex;
  gap: 1.625rem;
}

.masthead__menu .nav-item .dropdown-menu {
  border: 1px solid #e6ddcd;
  border-radius: 0;
  box-shadow: 0 8px 24px rgb(36 31 26 / 10%);
}
</style>

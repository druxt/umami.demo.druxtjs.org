<template>
  <div>
    <!-- The view's own title is the heading: Drupal owns this copy. -->
    <h2 v-if="$scopedSlots.header" class="band__title">
      <slot name="header" />
    </h2>

    <b-row>
      <slot
        name="results"
        :wrapper="{
          component: 'b-col',
          class: 'mb-4',
          propsData: {
            cols: 6,
            md: 4,
            lg: 3,
          },
        }"
      />
    </b-row>

    <b-button class="band__cta" to="/en/recipes" variant="outline-secondary">
      All recipes
    </b-button>
  </div>
</template>

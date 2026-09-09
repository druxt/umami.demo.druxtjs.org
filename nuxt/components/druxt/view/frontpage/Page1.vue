<template>
  <div>
    <AppSectionHead
      cta="All recipes"
      lede="Pulled from the Recipes view, four at a time."
      title="Recipes to try this week"
      to="/en/recipes"
    />

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
  </div>
</template>

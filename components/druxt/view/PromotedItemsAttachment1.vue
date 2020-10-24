<template>
  <b-row class="h-100">
    <slot
      name="results"
      :wrapper="{
        class: ['mb-3', 'mb-sm-0'],
        component: 'b-col',
        propsData: {
          cols: 12,
          sm: 6,
        },
      }"
    />
  </b-row>
</template>

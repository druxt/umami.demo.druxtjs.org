<template>
  <b-row class="h-100">
    <slot
      name="results"
      :result="{
        component: 'b-col',
        propsData: {
          class: 'mb-3 mb-sm-0',
          cols: 12,
          sm: 6,
        },
      }"
      :wrapper="false"
    />
  </b-row>
</template>

<template>
  <div>
    <!-- Header -->
    <b-row v-if="$scopedSlots.header">
      <b-col>
        <slot name="header" />
      </b-col>
    </b-row>

    <!-- Results. -->
    <b-row>
      <slot
        name="results"
        :wrapper="{
          class: 'mb-3',
          component: 'b-col',
          propsData: {
            cols: 12,
            md: 4,
            sm: 6,
          }
        }"
      />
    </b-row>
  </div>
</template>

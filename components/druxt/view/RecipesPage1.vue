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
        :result="{
          component: 'b-col',
          propsData: {
            class: 'mb-3',
            cols: 12,
            lg: 3,
            sm: 6,
          },
        }"
        :wrapper="false"
      />
    </b-row>
  </div>
</template>

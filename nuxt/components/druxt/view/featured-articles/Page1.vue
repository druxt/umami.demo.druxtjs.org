<template>
  <div>
    <!-- Header -->
    <b-row v-if="$scopedSlots.header">
      <b-col>
        <slot name="header" />
      </b-col>
    </b-row>

    <!-- Three teasers across, a snap scroller below md. The grid lives in
         .featured-strip, so the results are plain children here. -->
    <div class="featured-strip">
      <slot name="results" :wrapper="{ component: 'div' }" />
    </div>
  </div>
</template>

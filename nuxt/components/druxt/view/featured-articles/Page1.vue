<template>
  <div>
    <!-- Header -->
    <b-row v-if="$scopedSlots.header">
      <b-col>
        <slot name="header" />
      </b-col>
    </b-row>

    <!-- One column on a phone, three across from lg. -->
    <div class="article-grid">
      <slot name="results" :wrapper="{ component: 'div' }" />
    </div>
  </div>
</template>

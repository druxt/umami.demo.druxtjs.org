<template>
  <!-- display: contents, so these rows are children of the strip's grid
       rather than a row of their own. -->
  <div class="contents">
    <slot name="results" :wrapper="{ component: 'div' }" />
  </div>
</template>

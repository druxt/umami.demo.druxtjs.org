<template>
  <b-button variant="primary" @click="$parent.$emit('submit')">
    Save as unpublished
  </b-button>
</template>

<script>
/**
 * druxt_umami defaults new articles to unpublished, so the demo's write path
 * cannot publish. The label says what the save actually does.
 */
export default {}
</script>

<template>
  <div
    class="container d-flex align-items-center justify-content-center flex-column"
  >
    <b-spinner class="mb-3" /> Loading...
  </div>
</template>

<script>
export default {
  layout: 'plain',
  // middleware: ['auth'],
}
</script>

<style scoped>
.container {
  min-height: 70vh;
}
</style>

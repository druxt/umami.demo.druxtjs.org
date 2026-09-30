<template>
  <div
    class="container d-flex align-items-center justify-content-center flex-column"
  >
    <b-spinner class="mb-3" /> Loading...
  </div>
</template>

<script>
import { seoHead } from '~/utils/seo'
export default {

  layout: 'plain',
  head() {
    return seoHead({
      origin: this.$config.siteOrigin,
      path: this.$route.path,
      title: 'Signing in',
      robots: 'noindex, nofollow',
    })
  },
  // middleware: ['auth'],
}
</script>

<style scoped>
.container {
  min-height: 70vh;
}
</style>

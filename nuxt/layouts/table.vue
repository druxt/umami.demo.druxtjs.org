<template>
  <!-- An Umami Go table: the page draws a game bar where the masthead was,
       so the hand gets the screen. -->
  <div class="go-table-layout">
    <AppDemoBar />
    <client-only><AppDebugPanel /><AppDruxtInspector /></client-only>
    <main>
      <Nuxt />
    </main>
  </div>
</template>

<script>
import { langcodeOf } from '~/utils/lang'

export default {
  head() {
    return { htmlAttrs: { lang: langcodeOf(this.$route.path) } }
  },
}
</script>

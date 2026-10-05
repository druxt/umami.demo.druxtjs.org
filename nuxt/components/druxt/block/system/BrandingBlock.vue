<template>
  <b-navbar-brand class="masthead__brand" to="/">
    <span class="masthead__wordmark">Umami</span>
    <span class="masthead__tagline">Food magazine</span>
  </b-navbar-brand>
</template>

<script>
import { DruxtBlocksBlockMixin } from 'druxt-blocks'

/**
 * The Umami logo.svg is a raster-ish mark that sat awkwardly at the new
 * masthead size, so the branding block renders a type wordmark instead. The
 * block is still placed and configured in Drupal.
 */
export default {
  mixins: [DruxtBlocksBlockMixin],
}
</script>

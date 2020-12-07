<template>
  <b-container>
    <!-- Branding -->
    <slot name="umami_branding" />

    <b-navbar-toggle target="nav-collapse" />

    <b-collapse id="nav-collapse" class="ml-auto" is-nav>
      <b-navbar-nav class="ml-auto">
        <b-nav-item>
          <b-button v-b-toggle.search><BIconSearch /></b-button>
        </b-nav-item>
      </b-navbar-nav>

      <!-- Main menu -->
      <DruxtBlockSystemMenuBlockMain />
    </b-collapse>
  </b-container>
</template>

<script>
import { BIconSearch } from 'bootstrap-vue'

export default {
  components: { BIconSearch },
}
</script>

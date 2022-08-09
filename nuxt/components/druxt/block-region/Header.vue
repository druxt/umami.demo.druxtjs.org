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
      <div class="ml-auto">
        <!-- <b-navbar-nav class="justify-content-end">
          <b-nav-item v-if="!$auth.loggedIn" to="/login">Login</b-nav-item>
          <b-nav-item v-else @click="$auth.logout()">Log out</b-nav-item>
        </b-navbar-nav> -->
        <DruxtBlockSystemMenuBlockMain />
      </div>
    </b-collapse>
  </b-container>
</template>

<script>
import { BIconSearch } from 'bootstrap-vue'

export default {
  components: { BIconSearch },
}
</script>

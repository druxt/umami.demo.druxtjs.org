<template>
  <b-container>
    <!-- Branding -->
    <slot name="umami_branding" />

    <b-navbar-toggle target="nav-collapse" />

    <b-collapse id="nav-collapse" class="ml-auto" is-nav>
      <!-- Main menu -->
      <DruxtBlockSystemMenuBlockMain />
    </b-collapse>
  </b-container>
</template>

<template>
  <b-container>
    <!-- Branding -->
    <slot name="umami_branding" />

    <b-navbar-toggle target="nav-collapse" />

    <b-collapse id="nav-collapse" class="ml-auto" is-nav>
      <!-- Main menu -->
      <slot name="umami_main_menu" :wrapper="false" />
    </b-collapse>
  </b-container>
</template>

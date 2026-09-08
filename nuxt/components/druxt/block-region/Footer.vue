<template>
  <b-container>
    <b-row>
      <b-col class="mb-4 mb-md-0" md="8">
        <slot name="umami_footer_promo" />
      </b-col>

      <b-col md="4">
        <slot name="umami_footer" />
      </b-col>
    </b-row>
  </b-container>
</template>

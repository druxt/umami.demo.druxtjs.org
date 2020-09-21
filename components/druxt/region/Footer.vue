<template>
  <b-container>
    <b-row>
      <b-col class="mb-3" md="8">
        <slot name="umami_footer_promo" />
      </b-col>

      <b-col class="mb-3" md="4">
        <slot name="umami_footer" />
      </b-col>
    </b-row>
  </b-container>
</template>

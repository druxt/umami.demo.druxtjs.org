<template>
  <b-container v-if="!$attrs.editbar">
    <b-row>
      <b-col class="mb-3" md="8">
        <slot name="umami_footer_promo" />
      </b-col>

      <b-col class="mb-3" md="4">
        <slot name="umami_footer" />
      </b-col>
    </b-row>
  </b-container>

  <div v-else>
    <slot />
  </div>
</template>

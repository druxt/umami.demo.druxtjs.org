<template>
  <b-row>
    <b-col cols="12" lg="8">
      <slot name="field_disclaimer" />
    </b-col>

    <b-col cols="12" lg="4">
      <slot name="field_copyright" />
    </b-col>
  </b-row>
</template>

<script>
import { DruxtEntityMixin } from 'druxt-entity'

export default {
  mixins: [DruxtEntityMixin],
}
</script>
